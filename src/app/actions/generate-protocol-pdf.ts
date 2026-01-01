'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { getMeetingProtocol } from './protocols'

// Use Node.js runtime for PDF generation
export const runtime = 'nodejs'

// Dynamic import for Playwright (only in Node.js runtime)
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

    // 2) Render HTML template from snapshot
    const html = renderProtocolHtml(snapshot, protocol)

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
        error: 'Failed to upload PDF to storage',
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
        error: 'Failed to update protocol PDF path',
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
 */
function renderProtocolHtml(
  snapshot: any,
  protocol: { protocol_number: string; finalized_at: string | null }
): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protokolas ${protocol.protocol_number}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header .protocol-number {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
    }
    .info-row {
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: bold;
      display: inline-block;
      min-width: 150px;
    }
    .agenda-item {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .agenda-item-header {
      font-weight: bold;
      margin-bottom: 8px;
    }
    .agenda-item-number {
      display: inline-block;
      min-width: 30px;
      font-weight: bold;
    }
    .vote-results {
      margin-top: 10px;
      padding: 10px;
      background-color: #f5f5f5;
      border-left: 4px solid #333;
    }
    .vote-result-row {
      margin-bottom: 5px;
    }
    .resolution-status {
      margin-top: 8px;
      padding: 8px;
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
    }
    .quorum-status {
      padding: 10px;
      margin-top: 10px;
      border-left: 4px solid ${snapshot.quorum?.has_quorum ? '#4caf50' : '#f44336'};
      background-color: ${snapshot.quorum?.has_quorum ? '#e8f5e9' : '#ffebee'};
    }
    .footer {
      margin-top: 40px;
      text-align: right;
      font-size: 10pt;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PROTOKOLAS</h1>
    <div class="protocol-number">Nr. ${protocol.protocol_number}</div>
  </div>

  <div class="section">
    <div class="section-title">Susirinkimo informacija</div>
    <div class="info-row">
      <span class="info-label">Pavadinimas:</span>
      <span>${escapeHtml(snapshot.meeting.title)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Data ir laikas:</span>
      <span>${formatDate(snapshot.meeting.scheduled_at)}</span>
    </div>
    ${snapshot.meeting.location ? `
    <div class="info-row">
      <span class="info-label">Vieta:</span>
      <span>${escapeHtml(snapshot.meeting.location)}</span>
    </div>
    ` : ''}
    ${protocol.finalized_at ? `
    <div class="info-row">
      <span class="info-label">Protokolas sudarytas:</span>
      <span>${formatDate(protocol.finalized_at)}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Dalyvavimas</div>
    <div class="info-row">
      <span class="info-label">Asmeniškai:</span>
      <span>${snapshot.attendance.present_in_person}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Raštu:</span>
      <span>${snapshot.attendance.present_written}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Nuotoliniu būdu:</span>
      <span>${snapshot.attendance.present_remote}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Iš viso dalyvavo:</span>
      <span><strong>${snapshot.attendance.present_total}</strong> iš ${snapshot.attendance.total_active_members} narių</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Kvorumas</div>
    <div class="quorum-status">
      <div class="info-row">
        <span class="info-label">Kvorumas:</span>
        <span><strong>${snapshot.quorum?.has_quorum ? 'PASIEKTAS' : 'NEPASIEKTAS'}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Dalyvavo:</span>
        <span>${snapshot.quorum?.present_count || 0}</span>
      </div>
      ${snapshot.quorum?.required_count ? `
      <div class="info-row">
        <span class="info-label">Reikia:</span>
        <span>${snapshot.quorum.required_count}</span>
      </div>
      ` : ''}
      ${snapshot.quorum?.quorum_percentage ? `
      <div class="info-row">
        <span class="info-label">Kvorumo procentas:</span>
        <span>${snapshot.quorum.quorum_percentage}%</span>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Darbotvarkė</div>
    ${snapshot.agenda && snapshot.agenda.length > 0 ? snapshot.agenda.map((item: any, index: number) => `
    <div class="agenda-item">
      <div class="agenda-item-header">
        <span class="agenda-item-number">${item.item_no}.</span>
        <span>${escapeHtml(item.title)}</span>
      </div>
      ${item.summary ? `
      <div style="margin-top: 5px; margin-bottom: 5px;">
        <strong>Trumpas aprašymas:</strong> ${escapeHtml(item.summary)}
      </div>
      ` : ''}
      ${item.details ? `
      <div style="margin-top: 5px; margin-bottom: 5px; white-space: pre-wrap;">
        ${escapeHtml(item.details)}
      </div>
      ` : ''}
      ${item.resolution ? `
      <div class="resolution-status">
        <div><strong>Nutarimas:</strong> ${escapeHtml(item.resolution.title)}</div>
        <div style="margin-top: 5px;">
          <strong>Statusas:</strong> ${item.resolution.status}
          ${item.resolution.adopted_at ? ` | <strong>Patvirtinta:</strong> ${formatDateShort(item.resolution.adopted_at)}` : ''}
          ${item.resolution.recommended_at ? ` | <strong>Rekomenduota:</strong> ${formatDateShort(item.resolution.recommended_at)}` : ''}
        </div>
      </div>
      ` : ''}
      ${item.vote ? `
      <div class="vote-results">
        <div style="font-weight: bold; margin-bottom: 8px;">Balsavimo rezultatai:</div>
        <div class="vote-result-row">
          <span class="info-label">Statusas:</span>
          <span>${item.vote.status === 'CLOSED' ? 'Uždarytas' : 'Atviras'}</span>
          ${item.vote.closed_at ? ` (${formatDate(item.vote.closed_at)})` : ''}
        </div>
        ${item.vote.tallies ? `
        <div class="vote-result-row">
          <span class="info-label">UŽ:</span>
          <span><strong>${item.vote.tallies.votes_for}</strong></span>
        </div>
        <div class="vote-result-row">
          <span class="info-label">PRIEŠ:</span>
          <span><strong>${item.vote.tallies.votes_against}</strong></span>
        </div>
        <div class="vote-result-row">
          <span class="info-label">SUSILAIKĖ:</span>
          <span><strong>${item.vote.tallies.votes_abstain}</strong></span>
        </div>
        <div class="vote-result-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ccc;">
          <span class="info-label">Iš viso balsų:</span>
          <span><strong>${item.vote.tallies.votes_total}</strong></span>
        </div>
        ` : ''}
      </div>
      ` : ''}
      ${item.attachments && item.attachments.length > 0 ? `
      <div style="margin-top: 10px; font-size: 10pt; color: #666;">
        <strong>Priedai:</strong> ${item.attachments.map((att: any) => escapeHtml(att.file_name)).join(', ')}
      </div>
      ` : ''}
    </div>
    `).join('') : '<p>Darbotvarkės klausimų nėra</p>'}
  </div>

  <div class="footer">
    <div>Protokolas sugeneruotas: ${formatDate(new Date().toISOString())}</div>
    <div>Versija: ${protocol.version}</div>
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

