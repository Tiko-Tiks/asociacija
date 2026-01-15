'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { getMeetingProtocol } from './protocols'

// Dynamic import for Playwright
async function getPlaywright() {
  const playwright = await import('playwright')
  return playwright
}

/**
 * Generate PDF from protocol snapshot and upload to Storage
 */
export async function generateProtocolPdf(protocolId: string): Promise<{
  success: boolean
  pdfPath?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // 1) Get snapshot via RPC
    const protocolResult = await getMeetingProtocol(protocolId)
    if (!protocolResult.success || !protocolResult.protocol || !protocolResult.snapshot) {
      return {
        success: false,
        error: protocolResult.error || 'Failed to fetch protocol',
      }
    }

    const { protocol, snapshot } = protocolResult

    // 2) Get organization details
    let orgData: {
      name: string
      logo_url: string | null
      registration_number: string | null
      address: string | null
    } = {
      name: 'Organizacija',
      logo_url: null,
      registration_number: null,
      address: null
    }
    
    try {
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .select('name, logo_url, registration_number, address')
        .eq('id', protocol.org_id)
        .single()
      
      if (!orgError && org) {
        orgData = {
          name: org.name || 'Organizacija',
          logo_url: org.logo_url || null,
          registration_number: org.registration_number || null,
          address: org.address || null
        }
      }
    } catch (error) {
      console.error('Error fetching org data for PDF:', error)
    }
    
    // 2.5) Get quorum percentage from ruleset
    let quorumPercentage: number | null = null
    try {
      const { data: ruleset } = await supabase
        .from('ruleset_versions')
        .select('quorum_percentage')
        .eq('org_id', protocol.org_id)
        .eq('status', 'ACTIVE')
        .single()
      
      if (ruleset) {
        quorumPercentage = ruleset.quorum_percentage
      }
    } catch (error) {
      console.error('Error fetching quorum percentage:', error)
    }

    // 3) Fetch attendees list for signature table
    let attendeesList: Array<{
      full_name: string
      email: string
      mode: string
      role: string
    }> = []
    
    try {
      // Get live attendees (IN_PERSON)
      const { data: liveAttendees } = await supabase
        .from('meeting_attendance')
        .select(`
          mode,
          membership:memberships!inner(
            role,
            user_id,
            profile:profiles!inner(full_name, email)
          )
        `)
        .eq('meeting_id', protocol.meeting_id)
        .eq('present', true)
      
      if (liveAttendees) {
        for (const att of liveAttendees) {
          const membership = att.membership as any
          const profile = membership?.profile
          if (profile) {
            attendeesList.push({
              full_name: profile.full_name || profile.email || 'Nežinomas',
              email: profile.email || '',
              mode: att.mode || 'IN_PERSON',
              role: membership.role || 'MEMBER'
            })
          }
        }
      }
      
      // Get remote voters (WRITTEN/REMOTE) from vote_ballots
      const { data: remoteVoters } = await supabase
        .from('vote_ballots')
        .select(`
          channel,
          membership:memberships!inner(
            role,
            user_id,
            profile:profiles!inner(full_name, email)
          ),
          vote:votes!inner(meeting_id)
        `)
        .eq('vote.meeting_id', protocol.meeting_id)
        .in('channel', ['WRITTEN', 'REMOTE'])
      
      if (remoteVoters) {
        const seenMembershipIds = new Set(attendeesList.map(a => a.email))
        for (const voter of remoteVoters) {
          const membership = voter.membership as any
          const profile = membership?.profile
          if (profile && !seenMembershipIds.has(profile.email)) {
            seenMembershipIds.add(profile.email)
            attendeesList.push({
              full_name: profile.full_name || profile.email || 'Nežinomas',
              email: profile.email || '',
              mode: voter.channel || 'REMOTE',
              role: membership.role || 'MEMBER'
            })
          }
        }
      }
      
      // Sort by name
      attendeesList.sort((a, b) => a.full_name.localeCompare(b.full_name, 'lt'))
    } catch (error) {
      console.error('Error fetching attendees list:', error)
      // Continue without attendees - not critical for PDF generation
    }

    // 5) Fetch board composition for BOARD meetings
    let boardComposition: {
      members: Array<{
        position_type: string
        position_label: string
        full_name: string
        is_present: boolean
        can_vote: boolean
      }>
      total_members: number
      voting_members: number
      present_members: number
    } | null = null

    if (snapshot.meeting?.meeting_type === 'BOARD') {
      try {
        const { getBoardComposition } = await import('./board-members')
        const boardResult = await getBoardComposition(protocol.org_id)
        
        if (boardResult.success && boardResult.data) {
          // Get attendance for this meeting
          const boardMembershipIds = boardResult.data.members.map(m => m.membership_id).filter(Boolean)
          
          const { data: boardAttendance } = await supabase
            .from('meeting_attendance')
            .select('membership_id')
            .eq('meeting_id', protocol.meeting_id)
            .eq('present', true)
            .in('membership_id', boardMembershipIds)
          
          const presentMembershipIds = new Set((boardAttendance || []).map(a => a.membership_id))
          
          boardComposition = {
            members: boardResult.data.members.map(m => ({
              position_type: m.position_type,
              position_label: m.position_label,
              full_name: m.full_name,
              is_present: presentMembershipIds.has(m.membership_id),
              can_vote: m.can_vote,
            })),
            total_members: boardResult.data.total_members,
            voting_members: boardResult.data.voting_members,
            present_members: boardResult.data.members.filter(m => 
              presentMembershipIds.has(m.membership_id) && m.can_vote
            ).length,
          }
        }
      } catch (error) {
        console.error('Error fetching board composition:', error)
      }
    }

    // 6) Fetch vote breakdowns (live vs remote) for each agenda item
    let voteBreakdowns: Record<string, { liveTotals: any; remoteTotals: any }> = {}
    
    try {
      if (snapshot.agenda) {
        const { getVoteLiveTotals, getVoteTallies } = await import('./live-voting')
        
        for (const item of snapshot.agenda) {
          if (item.vote?.id) {
            const [liveTotals, remoteTotals] = await Promise.all([
              getVoteLiveTotals(item.vote.id),
              getVoteTallies(item.vote.id),
            ])
            
            voteBreakdowns[item.vote.id] = {
              liveTotals: liveTotals ? {
                votes_for: liveTotals.live_for_count || 0,
                votes_against: liveTotals.live_against_count || 0,
                votes_abstain: liveTotals.live_abstain_count || 0,
              } : null,
              remoteTotals: remoteTotals || null,
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching vote breakdowns:', error)
      // Continue without breakdowns - not critical
    }

    // 7) Render HTML template from snapshot
    const html = renderProtocolHtml(snapshot, protocol, orgData, quorumPercentage, attendeesList, boardComposition, voteBreakdowns)

    // 3) Render PDF using Playwright
    const playwright = await getPlaywright()
    const browser = await playwright.chromium.launch()
    const page = await browser.newPage()
    
    await page.setContent(html, { waitUntil: 'networkidle' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })

    await browser.close()

    // 4) Upload PDF to Storage
    const pdfPath = `org/${protocol.org_id}/meetings/${protocol.meeting_id}/protocols/${protocolId}_v${protocol.version}.pdf`
    const bucket = 'protocols'

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return {
        success: false,
        error: `Failed to upload PDF to storage: ${uploadError.message || 'Unknown error'}`,
      }
    }

    // 5) Persist pdf path via RPC
    const { data: rpcData, error: rpcError }: any = await supabase.rpc('set_protocol_pdf', {
      p_protocol_id: protocolId,
      p_bucket: bucket,
      p_path: pdfPath,
    })

    if (rpcError) {
      console.error('Error setting PDF path:', rpcError)
      return {
        success: false,
        error: `Failed to update protocol PDF path: ${rpcError.message || rpcError.code || 'Unknown RPC error'}`,
      }
    }

    const result = rpcData?.[0]
    if (!result?.ok) {
      return {
        success: false,
        error: result?.reason || 'Failed to update PDF path',
      }
    }

    return {
      success: true,
      pdfPath,
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    }
  }
}

/**
 * Render HTML template from protocol snapshot
 * Based on official Lithuanian association protocol template v2.0
 * Updated to match user's specific template structure
 */
function renderProtocolHtml(
  snapshot: any,
  protocol: { protocol_number: string; finalized_at: string | null; version: number; meeting_id: string },
  orgData: { name: string; logo_url: string | null; registration_number: string | null; address: string | null },
  quorumPercentage: number | null,
  attendeesList: Array<{ full_name: string; email: string; mode: string; role: string }> = [],
  boardComposition: {
    members: Array<{
      position_type: string
      position_label: string
      full_name: string
      is_present: boolean
      can_vote: boolean
    }>
    total_members: number
    voting_members: number
    present_members: number
  } | null = null,
  voteBreakdowns?: Record<string, { liveTotals: any; remoteTotals: any }>
): string {
  // Format functions
  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('lt-LT', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate meeting data
  const meetingLocation = snapshot.meeting?.location || 'Nenurodyta'
  const meetingDateShort = formatDateShort(snapshot.meeting.scheduled_at)
  const meetingDate = formatDate(snapshot.meeting.scheduled_at)
  const meetingStartTime = formatTime(snapshot.meeting.scheduled_at)
  
  // End time: use finalized_at (actual finalization time) if available, otherwise fallback to start + 2 hours
  // Note: In testing, finalized_at might be before scheduled_at, which is acceptable for now
  const meetingEndTime = protocol.finalized_at 
    ? formatTime(protocol.finalized_at) 
    : formatTime(new Date(new Date(snapshot.meeting.scheduled_at).getTime() + 2 * 60 * 60 * 1000).toISOString())
  
  // Attendance calculations
  const totalActiveMembers = snapshot.attendance?.total_active_members || 0
  const quorumPct = quorumPercentage || 50
  const minRequired = Math.ceil(totalActiveMembers * (quorumPct / 100))
  const presentInPerson = snapshot.attendance?.present_in_person || 0
  const presentRemote = snapshot.attendance?.present_remote || 0
  const presentWritten = snapshot.attendance?.present_written || 0
  const totalPresent = snapshot.attendance?.present_total || (presentInPerson + presentRemote + presentWritten)
  const hasQuorum = snapshot.quorum?.has_quorum || totalPresent >= minRequired
  
  // Get protocol title based on meeting type
  const getProtocolTitle = (meetingType: string): string => {
    switch (meetingType) {
      case 'GA':
        return 'VISUOTINIO NARIŲ SUSIRINKIMO PROTOKOLAS'
      case 'GA_EXTRAORDINARY':
        return 'NEEILINIO VISUOTINIO NARIŲ SUSIRINKIMO PROTOKOLAS'
      case 'BOARD':
        return 'VALDYBOS POSĖDŽIO PROTOKOLAS'
      default:
        return 'SUSIRINKIMO PROTOKOLAS'
    }
  }
  const protocolTitle = getProtocolTitle(snapshot.meeting?.meeting_type || 'GA')
  
  // Get meeting title for display
  const meetingTitle = snapshot.meeting?.title || `${new Date(snapshot.meeting.scheduled_at).getFullYear()} m. Visuotinis narių susirinkimas`

  // Find chairman and secretary from attendees or agenda items
  let chairman = 'Nepaskirtas'
  let secretary = 'Nepaskirtas'
  
  // Try to find from agenda items (items 1-3 are procedural)
  if (snapshot.agenda) {
    for (const item of snapshot.agenda) {
      if (item.title?.toLowerCase().includes('pirmininkas') || item.item_no === 2) {
        // TODO: Extract elected person name from resolution
        chairman = item.resolution?.title || 'Išrinktas susirinkimo metu'
      }
      if (item.title?.toLowerCase().includes('sekretor') || item.item_no === 3) {
        secretary = item.resolution?.title || 'Išrinktas susirinkimo metu'
      }
    }
  }

  // Build appendices list
  const appendices: Array<{ number: number; title: string }> = [
    { number: 1, title: 'Dalyvių registracijos lapas (gyvai) su parašais' },
    { number: 2, title: 'Nuotoliniu būdu balsavusių narių sąrašas (sistema sugeneruoja)' },
  ]
  
  // Add agenda item attachments
  let appendixCount = 2
  if (snapshot.agenda) {
    for (const item of snapshot.agenda) {
      if (item.attachments && item.attachments.length > 0) {
        for (const att of item.attachments) {
          appendixCount++
          appendices.push({ number: appendixCount, title: att.file_name || `Priedas prie ${item.item_no} klausimo` })
        }
      }
    }
  }
  
  // Add signed protocol placeholder
  appendixCount++
  appendices.push({ number: appendixCount, title: 'Pasirašyto protokolo skenuota kopija (įkeliama į sistemą)' })

  return `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protokolas Nr. ${protocol.protocol_number}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
    }
    
    /* Header */
    .org-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
    }
    .org-logo {
      margin-bottom: 10px;
    }
    .org-logo img {
      max-width: 100px;
      max-height: 50px;
    }
    .org-name {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .org-details {
      font-size: 10pt;
      color: #333;
    }
    
    /* Protocol title */
    .protocol-title {
      text-align: center;
      margin: 20px 0;
    }
    .protocol-title h1 {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 8px 0;
    }
    .protocol-number {
      font-size: 12pt;
      font-weight: bold;
    }
    
    /* Section */
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      background-color: #f0f0f0;
      padding: 5px 10px;
    }
    .section-content {
      padding-left: 10px;
    }
    .section-content p {
      margin: 5px 0;
    }
    
    /* Data row */
    .data-row {
      margin: 5px 0;
    }
    .data-label {
      font-weight: bold;
    }
    
    /* Quorum status */
    .quorum-status {
      font-weight: bold;
      margin-top: 10px;
      padding: 8px;
      background-color: ${hasQuorum ? '#e8f5e9' : '#ffebee'};
      border-left: 3px solid ${hasQuorum ? '#4caf50' : '#f44336'};
    }
    
    /* Agenda list */
    .agenda-list {
      margin: 10px 0;
      padding-left: 20px;
    }
    .agenda-list li {
      margin: 5px 0;
    }
    
    /* Question block */
    .question-block {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #ddd;
      page-break-inside: avoid;
    }
    .question-header {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ccc;
    }
    .question-content {
      margin: 10px 0;
    }
    
    /* Vote results */
    .vote-results {
      margin: 10px 0;
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #eee;
    }
    .vote-results p {
      margin: 3px 0;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }
    .vote-total {
      font-weight: bold;
      border-top: 1px solid #ccc;
      padding-top: 5px;
      margin-top: 5px;
    }
    .vote-result {
      font-weight: bold;
      margin-top: 8px;
      padding: 5px;
      background-color: #e3f2fd;
    }
    
    /* Decision */
    .decision-box {
      margin: 10px 0;
      padding: 10px;
      background-color: #e8f5e9;
      border-left: 3px solid #4caf50;
    }
    .decision-rejected {
      background-color: #ffebee;
      border-left-color: #f44336;
    }
    
    /* Appendices */
    .appendices-list {
      margin: 10px 0;
    }
    .appendices-list p {
      margin: 5px 0;
    }
    
    /* Signatures */
    .signatures-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-row {
      margin: 20px 0;
      display: flex;
      justify-content: space-between;
    }
    .signature-block {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      height: 25px;
      margin-bottom: 3px;
    }
    .signature-label {
      font-size: 10pt;
    }
    
    /* Participant table */
    .participant-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10pt;
    }
    .participant-table th,
    .participant-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: left;
    }
    .participant-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    .participant-table .num {
      width: 30px;
      text-align: center;
    }
    .participant-table .mode {
      width: 80px;
      text-align: center;
    }
    .participant-table .signature {
      width: 100px;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      text-align: right;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 5px;
    }
    
    /* Separator */
    .separator {
      border-top: 1px dashed #999;
      margin: 15px 0;
    }
  </style>
</head>
<body>

  <!-- Organizacijos antraštė -->
  <div class="org-header">
    ${orgData.logo_url ? `<div class="org-logo"><img src="${escapeHtml(orgData.logo_url)}" alt="Logo" /></div>` : ''}
    <div class="org-name">${escapeHtml(orgData.name)}</div>
    <div class="org-details">
      ${orgData.registration_number ? `Juridinio asmens kodas: ${escapeHtml(orgData.registration_number)}<br>` : ''}
      ${orgData.address ? `Buveinė: ${escapeHtml(orgData.address)}` : ''}
    </div>
  </div>

  <!-- Protokolo pavadinimas -->
  <div class="protocol-title">
    <h1>${protocolTitle}</h1>
    <div class="protocol-number">Nr. ${escapeHtml(protocol.protocol_number)}</div>
  </div>

  <!-- 1. SUSIRINKIMO DUOMENYS -->
  <div class="section">
    <div class="section-title">1. SUSIRINKIMO DUOMENYS</div>
    <div class="section-content">
      <p><span class="data-label">Susirinkimo pavadinimas:</span> ${escapeHtml(meetingTitle)}</p>
      <p><span class="data-label">Data:</span> ${meetingDateShort}</p>
      <p><span class="data-label">Vieta:</span> ${escapeHtml(meetingLocation)}</p>
      <p><span class="data-label">Pradžia:</span> ${meetingStartTime}</p>
      <p><span class="data-label">Pabaiga:</span> ${meetingEndTime}</p>
      <p><span class="data-label">Susirinkimo forma:</span> mišri (nuotoliniu būdu + gyvai)</p>
      ${snapshot.meeting?.published_at ? `
      <p style="margin-top: 10px;"><span class="data-label">Pranešimas nariams apie susirinkimą:</span></p>
      <p style="margin-left: 15px;">Paskelbimo data: ${formatDateShort(snapshot.meeting.published_at)}</p>
      ` : ''}
    </div>
  </div>

  <!-- 2. DALYVAVIMAS IR KVORUMAS -->
  ${snapshot.meeting?.meeting_type === 'BOARD' && boardComposition ? `
  <div class="section">
    <div class="section-title">2. VALDYBOS SUDĖTIS IR DALYVAVIMAS</div>
    <div class="section-content">
      <p>Pagal galiojančius įstatus valdybą sudaro <strong>${boardComposition.total_members}</strong> narių, 
      iš jų balsavimo teisę turi <strong>${boardComposition.voting_members}</strong>.</p>
      
      <table class="participant-table" style="margin: 15px 0;">
        <thead>
          <tr>
            <th class="num">Nr.</th>
            <th>Pareigos</th>
            <th>Vardas, Pavardė</th>
            <th style="width: 80px;">Dalyvavo</th>
          </tr>
        </thead>
        <tbody>
          ${boardComposition.members.map((member, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td>${escapeHtml(member.position_label)}</td>
            <td>${escapeHtml(member.full_name)}</td>
            <td style="text-align: center;">${member.is_present ? '✓ Taip' : '✗ Ne'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="quorum-status">
        Posėdyje dalyvavo: ${boardComposition.present_members} iš ${boardComposition.voting_members} balsavimo teisę turinčių valdybos narių.<br>
        Kvorumas: <strong>${boardComposition.present_members >= Math.floor(boardComposition.voting_members / 2) + 1 ? 'PASIEKTAS' : 'NEPASIEKTAS'}</strong>
      </div>
    </div>
  </div>
  ` : `
  <div class="section">
    <div class="section-title">2. DALYVAVIMAS IR KVORUMAS</div>
    <div class="section-content">
      <p><span class="data-label">Aktyvių narių skaičius (pagal aktyvių narių sąrašą):</span> ${totalActiveMembers}</p>
      <p><span class="data-label">Kvorumo reikalavimas:</span> ${quorumPct}% (pagal taisykles)</p>
      <p><span class="data-label">Minimalus reikalingas dalyvių skaičius:</span> ${minRequired}</p>
      <p style="margin-top: 10px;"><span class="data-label">Dalyvavo gyvai (užregistruota susirinkimo dieną):</span> ${presentInPerson} narių</p>
      <p><span class="data-label">Dalyvavo nuotoliniu būdu (iš anksto balsavo):</span> ${presentRemote + presentWritten} narių</p>
      <p><span class="data-label">Iš viso dalyvavo (be dubliavimo):</span> ${totalPresent} narių</p>
      
      <div class="quorum-status">
        Kvorumas: <strong>${hasQuorum ? 'PASIEKTAS' : 'NEPASIEKTAS'}</strong>
      </div>
    </div>
  </div>
  `}

  <!-- 3. SUSIRINKIMO PIRMININKAS IR SEKRETORIUS -->
  <div class="section">
    <div class="section-title">3. SUSIRINKIMO PIRMININKAS IR SEKRETORIUS</div>
    <div class="section-content">
      <p><span class="data-label">Susirinkimo pirmininkas:</span> ${escapeHtml(chairman)}</p>
      <p style="margin-left: 15px; font-size: 10pt; color: #666;">Paskyrimo pagrindas: išrinktas susirinkimo metu</p>
      <p style="margin-top: 10px;"><span class="data-label">Susirinkimo sekretorius:</span> ${escapeHtml(secretary)}</p>
      <p style="margin-left: 15px; font-size: 10pt; color: #666;">Paskyrimo pagrindas: išrinktas susirinkimo metu</p>
    </div>
  </div>

  <!-- 4. DARBOTVARKĖ -->
  <div class="section">
    <div class="section-title">4. DARBOTVARKĖ</div>
    <div class="section-content">
      <p><span class="data-label">Darbotvarkė patvirtinta:</span> TAIP</p>
      <p style="margin-top: 10px;"><span class="data-label">Patvirtinta darbotvarkė:</span></p>
      <ol class="agenda-list">
        ${snapshot.agenda && snapshot.agenda.length > 0 
          ? snapshot.agenda.map((item: any) => `<li>${escapeHtml(item.title)}</li>`).join('')
          : '<li>Darbotvarkės klausimų nėra</li>'
        }
      </ol>
    </div>
  </div>

  <!-- 5. SVARSTYTA IR NUTARTA -->
  <div class="section">
    <div class="section-title">5. SVARSTYTA IR NUTARTA (KLAUSIMAI IR BALSAVIMO REZULTATAI)</div>
    <div class="section-content">
      <p style="font-style: italic; margin-bottom: 15px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #999;">
        <strong>BENDRA TAISYKLĖ:</strong><br>
        • Nuotoliniai balsai užfiksuoti iki susirinkimo pradžios.<br>
        • Gyvi balsai protokolui fiksuojami agreguotai (susegant skaičius), individualūs gyvi balsai neregistruojami.<br>
        • Vienas narys turi vieną balsą; narys, balsavęs nuotoliu, nebuvo registruojamas gyvai.
      </p>
    </div>
    
    ${snapshot.agenda && snapshot.agenda.length > 0 ? snapshot.agenda.map((item: any) => {
      // Get vote breakdown if available
      const breakdown = voteBreakdowns?.[item.vote?.id]
      
      // Remote votes
      const remoteFor = breakdown?.remoteTotals?.votes_for || 0
      const remoteAgainst = breakdown?.remoteTotals?.votes_against || 0
      const remoteAbstain = breakdown?.remoteTotals?.votes_abstain || 0
      
      // Live votes
      const liveFor = breakdown?.liveTotals?.votes_for || 0
      const liveAgainst = breakdown?.liveTotals?.votes_against || 0
      const liveAbstain = breakdown?.liveTotals?.votes_abstain || 0
      
      // Total votes
      const votesFor = item.vote?.tallies?.votes_for || (remoteFor + liveFor)
      const votesAgainst = item.vote?.tallies?.votes_against || (remoteAgainst + liveAgainst)
      const votesAbstain = item.vote?.tallies?.votes_abstain || (remoteAbstain + liveAbstain)
      const totalVotes = votesFor + votesAgainst + votesAbstain
      const isApproved = votesFor > votesAgainst
      
      // Determine item type for specific handling
      const isAgendaApprovalItem = item.title?.toLowerCase().includes('darbotvark') || item.item_no === 1
      const isChairmanItem = item.title?.toLowerCase().includes('pirmininkas') || item.item_no === 2
      const isSecretaryItem = item.title?.toLowerCase().includes('sekretor') || item.item_no === 3
      
      // Generate decision text
      let decisionText = ''
      if (isAgendaApprovalItem && isApproved) {
        decisionText = 'Patvirtinti susirinkimo darbotvarkę.'
      } else if (isChairmanItem && isApproved) {
        decisionText = 'Išrinkti susirinkimo pirmininku.'
      } else if (isSecretaryItem && isApproved) {
        decisionText = 'Išrinkti susirinkimo sekretoriumi.'
      } else if (isApproved) {
        decisionText = item.resolution?.title || 'Pritarta.'
      } else if (totalVotes > 0) {
        decisionText = 'Nepritarta (balsų „už" skaičius nesudaro daugumos).'
      } else {
        decisionText = 'Balsavimas nevyko arba rezultatai neužfiksuoti.'
      }
      
      return `
    <div class="separator"></div>
    <div class="question-block">
      <div class="question-header">KLAUSIMAS Nr. ${item.item_no}: ${escapeHtml(item.title)}</div>
      
      <div class="question-content">
        <p><strong>Svarstyta:</strong> ${escapeHtml(item.details || item.summary || 'Klausimas svarstytas susirinkime.')}</p>
        ${item.resolution ? `<p><strong>Nutarimo projektas:</strong> ${escapeHtml(item.resolution.title || '')}</p>` : ''}
      </div>
      
      ${totalVotes > 0 ? `
      <div class="vote-results">
        <p><strong>Balsavimo rezultatai:</strong></p>
        <p>Nuotoliniu būdu (iš anksto): UŽ ${remoteFor}, PRIEŠ ${remoteAgainst}, SUSILAIKĖ ${remoteAbstain}</p>
        <p>Gyvai (agreguotai):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; UŽ ${liveFor}, PRIEŠ ${liveAgainst}, SUSILAIKĖ ${liveAbstain}</p>
        <p class="vote-total">Iš viso:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; UŽ ${votesFor}, PRIEŠ ${votesAgainst}, SUSILAIKĖ ${votesAbstain}</p>
        <p>Dalyvavo balsuojant (iš viso): ${totalVotes}</p>
        <p class="vote-result">Rezultatas: <strong>${isApproved ? 'PRIIMTA' : 'NEPRIIMTA'}</strong></p>
      </div>
      ` : `
      <div class="vote-results">
        <p><em>Balsavimo rezultatai neužfiksuoti.</em></p>
      </div>
      `}
      
      <div class="decision-box ${isApproved ? '' : 'decision-rejected'}">
        <p><strong>NUTARTA:</strong></p>
        <p>${escapeHtml(decisionText)}</p>
      </div>
    </div>
    `}).join('') : '<p>Darbotvarkės klausimų nėra.</p>'}
  </div>

  </div>

  <!-- 6. SUSIRINKIMO UŽBAIGIMAS -->
  <div class="section">
    <div class="section-title">6. SUSIRINKIMO UŽBAIGIMAS</div>
    <div class="section-content">
      <p><span class="data-label">Susirinkimas užbaigtas:</span> ${meetingDateShort} ${meetingEndTime}</p>
      <p style="margin-top: 10px;">Daugiau klausimų darbotvarkėje nebuvo. Susirinkimas baigtas.</p>
    </div>
  </div>

  <!-- 7. PRIEDAI -->
  <div class="section">
    <div class="section-title">7. PRIEDAI (PRIVALOMA STRUKTŪRA)</div>
    <div class="section-content appendices-list">
      ${appendices.map(app => `<p><strong>Priedas Nr. ${app.number}</strong> – ${escapeHtml(app.title)}</p>`).join('')}
    </div>
  </div>

  <!-- 8. PARAŠAI -->
  <div class="section signatures-section">
    <div class="section-title">8. PARAŠAI</div>
    <div class="section-content">
      <table style="width: 100%; margin-top: 20px;">
        <tr>
          <td style="width: 60%;">
            <p>Susirinkimo pirmininkas: _______________________</p>
          </td>
          <td style="width: 40%;">
            <p>[VARDAS PAVARDĖ]</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 5px;">
            <p style="margin-left: 200px;">Data: ____-__-__</p>
          </td>
        </tr>
      </table>
      
      <table style="width: 100%; margin-top: 30px;">
        <tr>
          <td style="width: 60%;">
            <p>Susirinkimo sekretorius: _______________________</p>
          </td>
          <td style="width: 40%;">
            <p>[VARDAS PAVARDĖ]</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 5px;">
            <p style="margin-left: 200px;">Data: ____-__-__</p>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <!-- PRIEDAS NR. 1 – DALYVIŲ REGISTRACIJOS LAPAS -->
  ${attendeesList.length > 0 ? `
  <div style="page-break-before: always;">
    <div class="section">
      <div class="section-title">PRIEDAS NR. 1 – DALYVIŲ REGISTRACIJOS LAPAS (GYVAI)</div>
      <div class="section-content">
        <table class="participant-table">
          <thead>
            <tr>
              <th class="num">Nr.</th>
              <th>Vardas, Pavardė</th>
              <th class="mode">Būdas</th>
              <th class="signature">Parašas</th>
            </tr>
          </thead>
          <tbody>
            ${attendeesList.filter(a => a.mode === 'IN_PERSON').map((attendee, index) => `
            <tr>
              <td class="num">${index + 1}</td>
              <td>${escapeHtml(attendee.full_name)}</td>
              <td class="mode">Gyvai</td>
              <td class="signature"></td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- PRIEDAS NR. 2 – NUOTOLINIO BALSAVIMO SĄRAŠAS -->
  ${attendeesList.filter(a => a.mode !== 'IN_PERSON').length > 0 ? `
  <div style="page-break-before: always;">
    <div class="section">
      <div class="section-title">PRIEDAS NR. 2 – NUOTOLINIU BŪDU BALSAVUSIŲ NARIŲ SĄRAŠAS</div>
      <div class="section-content">
        <p style="font-style: italic; margin-bottom: 10px;">Šis sąrašas sugeneruotas automatiškai pagal sistemoje užfiksuotus nuotolinius balsus.</p>
        <table class="participant-table">
          <thead>
            <tr>
              <th class="num">Nr.</th>
              <th>Vardas, Pavardė</th>
              <th class="mode">Būdas</th>
            </tr>
          </thead>
          <tbody>
            ${attendeesList.filter(a => a.mode !== 'IN_PERSON').map((attendee, index) => `
            <tr>
              <td class="num">${index + 1}</td>
              <td>${escapeHtml(attendee.full_name)}</td>
              <td class="mode">${attendee.mode === 'WRITTEN' ? 'Raštu' : 'Nuotoliniu'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <p>Protokolas sugeneruotas: ${formatDateTime(new Date().toISOString())} | Versija: ${protocol.version}</p>
  </div>

</body>
</html>
  `
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

