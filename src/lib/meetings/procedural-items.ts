/**
 * Procedūriniai darbotvarkės klausimai (GA)
 * 
 * Kiekvienas GA susirinkimas turi 3 privalomus procedūrinius klausimus:
 * 1. Darbotvarkės tvirtinimas
 * 2. Susirinkimo pirmininko rinkimas
 * 3. Susirinkimo sekretoriaus rinkimas
 * 
 * Šie klausimai:
 * - Automatiškai sukuriami kuriant GA susirinkimą
 * - System-generated (negali būti ištrinti)
 * - Visada pirmi (item_no 1-3)
 * - Reikalingi pagal LR teisės aktus
 * 
 * @see docs/VOTING_FLOW_SPECIFICATION.md
 */

import { createClient } from '@/lib/supabase/server'

export interface ProceduralAgendaItem {
  item_no: string
  title: string
  summary: string
  details: string
  is_procedural: boolean // Metadata flag
  resolution_template: string // Nutarimo projekto šablonas
}

/**
 * Procedūrinių klausimų šablonai
 * 
 * Pagal LR BĮ, VšĮ įstatymus ir Branduolys Charter
 */
export const PROCEDURAL_ITEMS: ProceduralAgendaItem[] = [
  {
    item_no: '1',
    title: 'Darbotvarkės tvirtinimas',
    summary: 'Susirinkimo darbotvarkės tvirtinimas',
    details: `Procedūrinis klausimas pagal įstatus. Neturi savarankiškos politinės ar projektinės reikšmės.

Tvirtinama susirinkimo darbotvarkė pagal iš anksto išplatintą projektą.

PROCEDŪRA:
1. Pirmininkas pristato darbotvarkės projektą
2. Dalyviams suteikiama galimybė siūlyti pakeitimus
3. Balsavimas dėl darbotvarkės tvirtinimo

TEISINIS PAGRINDAS:
- LR Asociacijų įstatymas
- Organizacijos įstatai
- Branduolys Charter`,
    is_procedural: true,
    resolution_template: `NUTARTA:

1. Patvirtinti susirinkimo darbotvarkę pagal pateiktą projektą.
2. Susirinkimą vesti tvirtinant darbotvarkėje nurodytą eigą.`,
  },
  {
    item_no: '2',
    title: 'Susirinkimo pirmininko rinkimas/tvirtinimas',
    summary: 'Susirinkimo pirmininko rinkimas arba tvirtinimas',
    details: `Procedūrinis klausimas pagal įstatus. Neturi savarankiškos politinės ar projektinės reikšmės.

Renkamas arba tvirtinamas asmuo, kuris ves susirinkimą.

PROCEDŪRA:
1. Kandidatų siūlymas
2. Kandidatų sutikimas
3. Balsavimas (jei keli kandidatai)
4. Pirmininko pareigų perdavimas

PIRMININKO FUNKCIJOS:
- Susirinkimo eigos valdymas
- Diskusijų moderavimas
- Balsavimų organizavimas
- Tvarkos palaikymas

TEISINIS PAGRINDAS:
- LR Civilinis kodeksas
- Organizacijos įstatai`,
    is_procedural: true,
    resolution_template: `NUTARTA:

1. Tvirtinti [Vardas Pavardė] susirinkimo pirmininku(-e).
2. Pavesti pirmininkui vesti susirinkimą pagal patvirtintą darbotvarkę.`,
  },
  {
    item_no: '3',
    title: 'Susirinkimo sekretoriaus rinkimas/tvirtinimas',
    summary: 'Susirinkimo sekretoriaus rinkimas arba tvirtinimas',
    details: `Procedūrinis klausimas pagal įstatus. Neturi savarankiškos politinės ar projektinės reikšmės.

Renkamas arba tvirtinamas asmuo, kuris fiksuos susirinkimo eigą ir rezultatus.

PROCEDŪRA:
1. Kandidatų siūlymas
2. Kandidatų sutikimas
3. Balsavimas (jei keli kandidatai)

SEKRETORIAUS FUNKCIJOS:
- Susirinkimo eigos fiksavimas
- Balsavimų rezultatų registravimas
- Protokolo rengimas
- Sprendimų dokumentavimas

TEISINIS PAGRINDAS:
- LR Asociacijų įstatymas
- Organizacijos įstatai`,
    is_procedural: true,
    resolution_template: `NUTARTA:

1. Tvirtinti [Vardas Pavardė] susirinkimo sekretoriumi(-e).
2. Pavesti sekretoriui fiksuoti susirinkimo eigą ir parengti protokolą.`,
  },
]

/**
 * Sukurti procedūrinius darbotvarkės klausimus susirinkimui
 * 
 * @param meetingId - Meeting ID
 * @param orgId - Organization ID
 * @returns Sukurtų klausimų skaičius
 */
export async function createProceduralAgendaItems(
  meetingId: string,
  orgId: string
): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = await createClient()

  try {
    // Patikrinti ar procedūriniai klausimai jau egzistuoja SU resolution_id
    // item_no yra INTEGER tipo, reikia naudoti integer reikšmes
    const { data: existing } = await supabase
      .from('meeting_agenda_items')
      .select('item_no, resolution_id')
      .eq('meeting_id', meetingId)
      .in('item_no', [1, 2, 3])

    // Patikrinti ar VISI procedūriniai klausimai turi resolution_id
    const itemsWithResolution = (existing || []).filter((item) => item.resolution_id !== null)
    
    if (itemsWithResolution.length === 3) {
      console.log('[createProceduralAgendaItems] All procedural items have resolutions', {
        meeting_id: meetingId,
        existing_count: existing?.length,
      })
      return { success: true, created: 0 }
    }
    
    // Jei yra items be resolution_id - sukurti resolutions jiems
    const itemsWithoutResolution = (existing || []).filter((item) => item.resolution_id === null)
    if (itemsWithoutResolution.length > 0) {
      console.log('[createProceduralAgendaItems] Found items without resolution_id, will fix', {
        meeting_id: meetingId,
        items_without_resolution: itemsWithoutResolution.map((i) => i.item_no),
      })
    }

    // Sukurti procedūrinius klausimus arba pridėti resolutions esamiems
    let created = 0

    for (const template of PROCEDURAL_ITEMS) {
      const itemNo = parseInt(template.item_no, 10)
      
      // Patikrinti ar šis item jau egzistuoja
      const existingItem = (existing || []).find((i) => i.item_no === itemNo)
      
      // Jei item egzistuoja su resolution_id - praleisti
      if (existingItem && existingItem.resolution_id) {
        console.log('[createProceduralAgendaItems] Item already has resolution', {
          item_no: itemNo,
          resolution_id: existingItem.resolution_id,
        })
        continue
      }
      
      // Sukurti rezoliucijos projektą
      const { data: resolution, error: resError } = await supabase
        .from('resolutions')
        .insert({
          org_id: orgId,
          title: `${template.item_no}. ${template.title}`,
          content: template.resolution_template,
          status: 'PROPOSED',
          meeting_id: meetingId,
        })
        .select('id')
        .single()

      if (resError || !resolution) {
        console.error('[createProceduralAgendaItems] Failed to create resolution', {
          item_no: template.item_no,
          error: resError,
        })
        continue
      }

      // Jei item jau egzistuoja be resolution_id - atnaujinti
      if (existingItem && !existingItem.resolution_id) {
        const { error: updateError } = await supabase
          .from('meeting_agenda_items')
          .update({ resolution_id: resolution.id })
          .eq('meeting_id', meetingId)
          .eq('item_no', itemNo)
        
        if (updateError) {
          console.error('[createProceduralAgendaItems] Failed to update agenda item', {
            item_no: template.item_no,
            error: updateError,
          })
          continue
        }
        
        created++
        console.log('[createProceduralAgendaItems] Updated existing item with resolution', {
          meeting_id: meetingId,
          item_no: template.item_no,
          resolution_id: resolution.id,
        })
        continue
      }

      // Sukurti naują darbotvarkės klausimą
      const { error: itemError } = await supabase
        .from('meeting_agenda_items')
        .insert({
          meeting_id: meetingId,
          item_no: itemNo,
          title: template.title,
          summary: template.summary,
          details: template.details,
          resolution_id: resolution.id,
        })

      if (itemError) {
        console.error('[createProceduralAgendaItems] Failed to create agenda item', {
          item_no: template.item_no,
          error: itemError,
        })
        continue
      }

      created++
      console.log('[createProceduralAgendaItems] Created procedural item', {
        meeting_id: meetingId,
        item_no: template.item_no,
        resolution_id: resolution.id,
      })
    }

    return { success: true, created }
  } catch (error: any) {
    console.error('[createProceduralAgendaItems] Error', error)
    return {
      success: false,
      created: 0,
      error: error.message || 'Unknown error',
    }
  }
}

/**
 * Validuoti ar susirinkimas turi visus procedūrinius klausimus
 * 
 * @param meetingId - Meeting ID
 * @returns Validacijos rezultatas
 */
export async function validateProceduralItems(
  meetingId: string
): Promise<{ valid: boolean; missing: string[]; details?: string }> {
  const supabase = await createClient()

  // item_no yra INTEGER tipo
  // SVARBU: Tikrinti ar items turi resolution_id (ne tik ar egzistuoja)
  const { data: items } = await supabase
    .from('meeting_agenda_items')
    .select('item_no, title, resolution_id')
    .eq('meeting_id', meetingId)
    .in('item_no', [1, 2, 3])

  console.log('[validateProceduralItems] Checking procedural items', {
    meeting_id: meetingId,
    found_items: items?.map((i) => ({ 
      item_no: i.item_no, 
      title: i.title,
      has_resolution: !!i.resolution_id 
    })) || [],
  })

  // Tikrinti ar VISI items turi resolution_id
  const validItems = (items || []).filter((item) => item.resolution_id !== null)
  const validItemNos = validItems.map((item) => String(item.item_no))
  const requiredItemNos = ['1', '2', '3']
  const missing = requiredItemNos.filter((no) => !validItemNos.includes(no))

  if (missing.length === 0) {
    return { valid: true, missing: [] }
  }

  // Išvardinti trūkstamus (arba be resolution_id)
  const missingDetails = missing.map((no) => {
    const existingItem = (items || []).find((i) => String(i.item_no) === no)
    if (existingItem && !existingItem.resolution_id) {
      return `${no}. ${existingItem.title} (be rezoliucijos)`
    }
    const template = PROCEDURAL_ITEMS.find((t) => t.item_no === no)
    return `${no}. ${template?.title || 'Nežinomas'} (neegzistuoja)`
  })

  return {
    valid: false,
    missing,
    details: `Trūksta arba nepilni procedūriniai klausimai: ${missingDetails.join(', ')}`,
  }
}

/**
 * Patikrinti ar darbotvarkės klausimas yra procedūrinis
 * 
 * @param agendaItem - Agenda item object
 * @returns true jei procedūrinis
 * 
 * NOTE: metadata stulpelio nėra schema, naudojame tik item_no (1, 2, 3) kaip procedūrinių klausimų žymę
 */
export function isProceduralItem(agendaItem: any): boolean {
  // Check item_no (procedural items are always 1, 2, 3)
  // item_no yra integer tipo, bet palyginimas gali būti su string
  const itemNo = typeof agendaItem.item_no === 'number' 
    ? agendaItem.item_no 
    : parseInt(String(agendaItem.item_no), 10)
  
  if (itemNo >= 1 && itemNo <= 3) {
    return true
  }

  return false
}

/**
 * Patikrinti ar darbotvarkės klausimą galima ištrinti
 * 
 * @param agendaItem - Agenda item object
 * @returns { deletable: boolean, reason?: string }
 */
export function canDeleteAgendaItem(agendaItem: any): {
  deletable: boolean
  reason?: string
} {
  if (isProceduralItem(agendaItem)) {
    return {
      deletable: false,
      reason: 'Procedūriniai klausimai (1-3) negali būti ištrinti. Jie yra privalomi pagal LR teisės aktus.',
    }
  }

  return { deletable: true }
}

/**
 * Patikrinti ar procedūrinė GA eiga įvykdyta
 * 
 * Esminiai klausimai (item_no >= 4) negali būti uždaromi/taikomi,
 * kol neįvykdyti visi 3 procedūriniai klausimai (1-3).
 * 
 * @param meetingId - Meeting ID
 * @param currentItemNo - Current item_no (optional, default: check all)
 * @returns { completed: boolean, missing: string[], details: string }
 */
export async function isProceduralSequenceCompleted(
  meetingId: string,
  currentItemNo?: string
): Promise<{
  completed: boolean
  missing: string[]
  details?: string
}> {
  const supabase = await createClient()

  // Jei tai procedūrinis klausimas (1-3), visada leisti
  // currentItemNo gali būti string arba number
  if (currentItemNo && ['1', '2', '3'].includes(String(currentItemNo))) {
    return { completed: true, missing: [] }
  }

  // Gauti visus procedūrinius klausimus su jų rezoliucijomis
  // item_no yra INTEGER tipo
  const { data: items } = await supabase
    .from('meeting_agenda_items')
    .select(`
      item_no,
      title,
      resolution_id,
      resolutions (
        status
      )
    `)
    .eq('meeting_id', meetingId)
    .in('item_no', [1, 2, 3])

  if (!items || items.length === 0) {
    return {
      completed: false,
      missing: ['1', '2', '3'],
      details: 'Procedūriniai klausimai neegzistuoja',
    }
  }

  // Patikrinti kiekvieno procedūrinio klausimo statusą
  const missing: string[] = []

  for (const requiredNo of ['1', '2', '3']) {
    // item_no yra integer, palyginimas su string
    const item = items.find((i) => String(i.item_no) === requiredNo)

    if (!item) {
      missing.push(requiredNo)
      continue
    }

    // Patikrinti ar rezoliucija APPROVED
    const resolution = (item as any).resolutions
    if (!resolution || resolution.status !== 'APPROVED') {
      missing.push(requiredNo)
    }
  }

  if (missing.length > 0) {
    const missingTitles = PROCEDURAL_ITEMS
      .filter((item) => missing.includes(item.item_no))
      .map((item) => `${item.item_no}. ${item.title}`)

    return {
      completed: false,
      missing,
      details: `Procedūrinė eiga neužbaigta. Prieš taikant esminius klausimus, reikia užbaigti: ${missingTitles.join(', ')}`,
    }
  }

  return { completed: true, missing: [] }
}

/**
 * Patikrinti ar galima taikyti balsavimo rezultatą
 * 
 * Esminiams klausimams (4+) reikalauja, kad procedūriniai (1-3) būtų APPROVED
 * 
 * @param meetingId - Meeting ID
 * @param agendaItemNo - Agenda item number
 * @returns { allowed: boolean, reason?: string }
 */
export async function canApplyVoteOutcome(
  meetingId: string,
  agendaItemNo: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Jei procedūrinis klausimas - visada leisti
  if (['1', '2', '3'].includes(agendaItemNo)) {
    return { allowed: true }
  }

  // Esminiam klausimui - patikrinti procedūrinę eigą
  const sequenceCheck = await isProceduralSequenceCompleted(meetingId, agendaItemNo)

  if (!sequenceCheck.completed) {
    return {
      allowed: false,
      reason: sequenceCheck.details || 'Procedūrinė eiga neužbaigta',
    }
  }

  return { allowed: true }
}

