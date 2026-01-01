'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS, INVOICE_STATUS } from '@/app/domain/constants'

/**
 * AI Copilot Server Actions (B1.3)
 * 
 * Procedural, template-based responses.
 * No external LLM API, no DB writes, advisory only.
 */

export type CopilotPromptType =
  | 'AGENDA'
  | 'ANNOUNCEMENT'
  | 'MONTHLY_TASKS'
  | 'REPORT_PREP'

export interface CopilotResponse {
  type: CopilotPromptType
  title: string
  content: string
  timestamp: string
}

interface OrgStats {
  name: string
  activeMembers: number
  pendingMembers: number
  unpaidInvoices: number | null
}

/**
 * Get organization stats for context-aware responses
 */
async function getOrgStats(orgId: string): Promise<OrgStats> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const [
    orgResult,
    activeMembersResult,
    pendingMembersResult,
    invoicesResult,
  ] = await Promise.all([
    supabase
      .from('orgs')
      .select('name')
      .eq('id', orgId)
      .single(),
    supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', MEMBERSHIP_STATUS.ACTIVE),
    supabase
      .from('memberships')
      .select('id, member_status, status', { count: 'exact' })
      .eq('org_id', orgId),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', INVOICE_STATUS.SENT)
      .then((result) => result)
      .catch(() => ({ data: null, count: null, error: null })),
  ])

  if (orgResult.error && orgResult.error?.code !== 'PGRST116') {
    if (orgResult.error?.code === '42501') authViolation()
    console.error('Error fetching org stats:', orgResult.error)
  }

  const pendingCount = (pendingMembersResult.data || []).filter((m: any) => {
    return m.member_status === 'PENDING' || m.status !== MEMBERSHIP_STATUS.ACTIVE
  }).length

  return {
    name: orgResult.data?.name || 'Bendruomenė',
    activeMembers: activeMembersResult.count || 0,
    pendingMembers: pendingCount,
    unpaidInvoices: invoicesResult.count ?? null,
  }
}

/**
 * Generate agenda template
 */
function generateAgenda(stats: OrgStats): string {
  return `# Susirinkimo darbotvarkė

## 1. Atidarymas ir sveikinimas
- Sveikinimas su nariais (${stats.activeMembers} aktyvūs nariai)
- Patvirtinti susirinkimo darbotvarkę

## 2. Narystės klausimai
${stats.pendingMembers > 0 ? `- Aptarti ${stats.pendingMembers} laukiančių patvirtinimo narių prašymus` : '- Nėra laukiančių prašymų'}
- Naujų narių priėmimas

## 3. Finansinė būklė
${stats.unpaidInvoices !== null && stats.unpaidInvoices > 0 ? `- Aptarti ${stats.unpaidInvoices} neapmokėtų sąskaitų būklę` : '- Finansinė būklė'}
- Biudžeto ataskaita

## 4. Veiklos ataskaitos
- Projekto progresas
- Renginių planavimas
- Kiti klausimai

## 5. Uždarymas
- Kiti klausimai
- Kito susirinkimo data`
}

/**
 * Generate announcement template
 */
function generateAnnouncement(stats: OrgStats): string {
  return `# Pranešimas nariams

Gerbiami ${stats.name} nariai,

${stats.pendingMembers > 0 ? `Informuojame, kad šiuo metu laukia patvirtinimo ${stats.pendingMembers} naujų narių prašymai.` : 'Informuojame apie svarbius bendruomenės klausimus.'}

${stats.unpaidInvoices !== null && stats.unpaidInvoices > 0 ? `Primename, kad yra ${stats.unpaidInvoices} neapmokėtų sąskaitų.` : ''}

Prašome būti aktyvūs ir dalyvauti bendruomenės veikloje.

Pagarbiai,
Bendruomenės valdyba`
}

/**
 * Generate monthly tasks checklist
 */
function generateMonthlyTasks(stats: OrgStats): string {
  return `# Mėnesio užduočių sąrašas

## Narystės valdymas
- [ ] Peržiūrėti laukiančių narių prašymus${stats.pendingMembers > 0 ? ` (${stats.pendingMembers} laukia)` : ''}
- [ ] Atnaujinti narių sąrašą
- [ ] Patvirtinti naujus narius

## Finansinė veikla
${stats.unpaidInvoices !== null && stats.unpaidInvoices > 0 ? `- [ ] Susisiekti dėl ${stats.unpaidInvoices} neapmokėtų sąskaitų\n` : ''}- [ ] Peržiūrėti finansinę būklę
- [ ] Parengti biudžeto ataskaitą

## Veiklos planavimas
- [ ] Peržiūrėti vykdomus projektus
- [ ] Planuoti artėjančius renginius
- [ ] Atnaujinti veiklos planą

## Komunikacija
- [ ] Paskelbti svarbius pranešimus
- [ ] Atnaujinti bendruomenės informaciją
- [ ] Organizuoti susitikimą su nariais`
}

/**
 * Generate report preparation guide
 */
function generateReportPrep(stats: OrgStats): string {
  return `# Ataskaitos pasiruošimo gidas

## 1. Narystės statistika
- Aktyvūs nariai: ${stats.activeMembers}
${stats.pendingMembers > 0 ? `- Laukia patvirtinimo: ${stats.pendingMembers}\n` : ''}
## 2. Finansinė būklė
${stats.unpaidInvoices !== null ? `- Neapmokėtos sąskaitos: ${stats.unpaidInvoices}\n` : '- Finansinė būklė: peržiūrėti\n'}
## 3. Veiklos ataskaita
- Vykdomi projektai
- Užbaigti projektai
- Renginiai ir veikla

## 4. Rekomendacijos
- Pateikite konkretų skaičių ir faktus
- Pabrėžkite pasiektus rezultatus
- Nurodykite iššūkius ir sprendimus
- Pateikite planus ateityje

## 5. Pateikimo formatas
- Struktūruotas dokumentas
- Vizualizacijos (jei reikia)
- Trumpa santrauka ir išsami ataskaita`
}

/**
 * AI Copilot Assist - Main Server Action
 * 
 * Returns template-based response based on prompt type.
 * Context-aware using organization stats.
 */
export async function aiCopilotAssist(
  orgId: string,
  promptType: CopilotPromptType
): Promise<CopilotResponse> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get organization stats for context
  const stats = await getOrgStats(orgId)

  let title: string
  let content: string

  switch (promptType) {
    case 'AGENDA':
      title = 'Susirinkimo darbotvarkė'
      content = generateAgenda(stats)
      break
    case 'ANNOUNCEMENT':
      title = 'Pranešimas nariams'
      content = generateAnnouncement(stats)
      break
    case 'MONTHLY_TASKS':
      title = 'Mėnesio užduotys'
      content = generateMonthlyTasks(stats)
      break
    case 'REPORT_PREP':
      title = 'Ataskaitos pasiruošimas'
      content = generateReportPrep(stats)
      break
    default:
      title = 'Pagalba'
      content = 'Prašome pasirinkti vieną iš galimų užklausų.'
  }

  return {
    type: promptType,
    title,
    content,
    timestamp: new Date().toISOString(),
  }
}

