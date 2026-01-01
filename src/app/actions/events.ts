'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { canPublish } from '@/app/domain/guards/canPublish'
import { requireOrgActive } from '@/app/domain/guards/orgActivation'
import { revalidatePath } from 'next/cache'

/**
 * Server Action to create a new event.
 * 
 * Rules:
 * - MUST call canPublish(orgId) before insert
 * - Logs to audit_logs (soft audit mode)
 * 
 * @param orgId - Organization ID
 * @param title - Event title (required)
 * @param start_time - Event start time (required, ISO string)
 * @param location - Event location (optional)
 * @param description - Event description (optional)
 * @returns Created event ID or error
 */
export async function createEvent(
  orgId: string,
  title: string,
  start_time: string,
  location?: string,
  description?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Check org activation (CRITICAL)
  try {
    await requireOrgActive(orgId)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Organizacija nėra aktyvi. Prašome užbaigti aktyvacijos procesą.' }
    }
    throw error
  }

  // Step 2: Check publishing permissions
  try {
    await canPublish(orgId)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Neturite teisių publikuoti turinį' }
    }
    throw error
  }

  // Step 3: Validate inputs
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'Pavadinimas yra privalomas' }
  }

  if (!start_time) {
    return { success: false, error: 'Pradžios laikas yra privalomas' }
  }

  // Validate date format
  const startDate = new Date(start_time)
  if (isNaN(startDate.getTime())) {
    return { success: false, error: 'Neteisingas datos formatas' }
  }

  // Step 4: Insert event
  const { data: insertedEvent, error: insertError }: any = await supabase
    .from('events')
    .insert({
      org_id: orgId,
      title: title.trim(),
      event_date: start_time,
      location: location?.trim() || null,
      description: description?.trim() || null,
    })
    .select('id, title, event_date')
    .single()

  if (insertError) {
    if (insertError?.code === '42501') {
      authViolation()
    }
    if (insertError?.code === '42P01') {
      // Table doesn't exist
      return { success: false, error: 'Renginių lentelė neegzistuoja' }
    }
    console.error('Error creating event:', insertError)
    return { success: false, error: 'Nepavyko sukurti renginio' }
  }

  if (!insertedEvent) {
    return { success: false, error: 'Nepavyko sukurti renginio' }
  }

  // Step 5: Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: user.id,
      action: 'EVENT_CREATED',
      target_table: 'events',
      target_id: insertedEvent.id,
      old_value: null,
      new_value: {
        id: insertedEvent.id,
        title: insertedEvent.title,
        event_date: insertedEvent.event_date,
      },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail the operation
    console.error('AUDIT INCIDENT: Failed to log EVENT_CREATED:', auditError)
    // Surface for monitoring / incident review
  }

  // Step 6: Revalidate dashboard path
  // Note: We can't use dynamic slug here, so we revalidate all dashboard pages
  revalidatePath('/dashboard', 'layout')

  return {
    success: true,
    eventId: insertedEvent.id,
  }
}

/**
 * AI Assist: Generate event template text
 * 
 * Mock implementation - returns template text
 * 
 * @param orgId - Organization ID
 * @returns Template text for event
 */
export async function aiAssistEvent(orgId: string): Promise<{ title: string; description: string }> {
  // Mock AI - returns template
  return {
    title: 'Bendruomenės susitikimas',
    description: 'Kviečiame visus narius dalyvauti bendruomenės susitikime. Aptarsime svarbiausius klausimus ir planus.',
  }
}

