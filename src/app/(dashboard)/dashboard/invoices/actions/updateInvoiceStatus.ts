'use server'

import { createClient } from '@/lib/supabase/server'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS, MEMBERSHIP_ROLE, INVOICE_STATUS } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'
import { isPilotMode } from '@/lib/pilot-mode'

/**
 * Server Action to update invoice status (DRAFT → SENT).
 * 
 * Uses Supabase authenticated user client (no service_role).
 * Does NOT change database schema or RLS.
 * 
 * Rules:
 * - Derives org_id ONLY from invoice record (never from client input)
 * - Resolves membership by auth.uid() and invoice.org_id
 * - Allows only role = OWNER and status = ACTIVE
 * - Allows only status transition: DRAFT → SENT
 * - Throws explicit errors on failure
 * 
 * @param invoice_id - UUID of the invoice to update
 * @returns Success indicator
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateInvoiceStatus(
  invoice_id: string,
  new_status: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Step 1: Get authenticated user via supabase.auth.getUser()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    authViolation()
  }

  // Step 2: Load invoice by id, select: id, org_id, status
  const { data: invoice, error: invoiceError }: any = await supabase
    .from('invoices')
    .select('id, org_id, status')
    .eq('id', invoice_id)
    .single()

  if (invoiceError) {
    if (invoiceError?.code === '42501') {
      authViolation()
    }
    console.error('PILOT_SEND_DEBUG [SERVER] Error fetching invoice:', invoiceError)
    operationFailed()
  }

  // Step 3: Reject if invoice not found
  if (!invoice || !invoice.org_id) {
    console.error('PILOT_SEND_DEBUG [SERVER] Invoice not found or missing org_id:', {
      invoice_id,
      invoice,
      invoice_org_id: invoice?.org_id,
    })
    operationFailed()
  }

  // PILOT_SEND_DEBUG: Log invoice org_id (source of truth) before membership resolution
  // Also resolve org to get slug for pilot mode check
  const { data: activeOrg, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, slug')
    .eq('id', invoice.org_id)
    .single()

  const activeOrgSlug = activeOrg?.slug || null
  const pilotAllowed = activeOrgSlug ? isPilotMode(activeOrgSlug) : false

  console.error('PILOT_SEND_DEBUG [SERVER] Invoice loaded with org context:', {
    invoice_id,
    invoice_org_id: invoice.org_id,
    invoice_status: invoice.status,
    user_id: user.id,
    activeOrg_id: activeOrg?.id || null,
    activeOrg_slug: activeOrgSlug,
    pilotAllowed,
    orgError: orgError ? { code: orgError.code, message: orgError.message } : null,
  })

  // Step 4: Allow only status transition DRAFT -> SENT
  if (invoice.status !== 'DRAFT') {
    console.error('Invoice status is not DRAFT, cannot transition to SENT:', {
      invoice_id,
      current_status: invoice.status,
      required_status: 'DRAFT',
    })
    operationFailed()
  }

  // Step 5: Resolve membership by auth.uid() and invoice.org_id
  // PILOT_SEND_DEBUG: Log before membership query
  console.error('PILOT_SEND_DEBUG [SERVER] Resolving membership:', {
    user_id: user.id,
    invoice_org_id: invoice.org_id,
    membership_status_filter: MEMBERSHIP_STATUS.ACTIVE,
  })

  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', invoice.org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('PILOT_SEND_DEBUG [SERVER] Error fetching membership:', membershipError)
    operationFailed()
  }

  // Step 6: Allow only role OWNER and status ACTIVE
  // PILOT_SEND_DEBUG: Log membership resolution result
  console.error('PILOT_SEND_DEBUG [SERVER] Membership resolved:', {
    membership_found: !!membership,
    membership_id: membership?.id,
    membership_role: membership?.role,
    membership_status: membership?.status,
    required_role: MEMBERSHIP_ROLE.OWNER,
    required_status: MEMBERSHIP_STATUS.ACTIVE,
  })

  if (!membership) {
    console.error('PILOT_SEND_DEBUG [SERVER] No ACTIVE membership found for user in invoice organization:', {
      user_id: user.id,
      invoice_org_id: invoice.org_id,
    })
    operationFailed()
  }

  if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    console.error('Membership status is not ACTIVE:', {
      membership_id: membership.id,
      status: membership.status,
    })
    operationFailed()
  }

  if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
    console.error('User role is not OWNER:', {
      membership_id: membership.id,
      role: membership.role,
      required_role: MEMBERSHIP_ROLE.OWNER,
    })
    operationFailed()
  }

  // Step 7: Update invoice status (validate new_status is SENT)
  if (new_status !== INVOICE_STATUS.SENT) {
    console.error('Invalid status transition, only DRAFT -> SENT allowed:', {
      invoice_id,
      requested_status: new_status,
      allowed_status: INVOICE_STATUS.SENT,
    })
    operationFailed()
  }

  // Update invoice status with both id and org_id conditions for safety
  // Add .select('id') to detect RLS-blocked updates
  const { data: updatedRows, error: updateError }: any = await supabase
    .from('invoices')
    .update({ status: INVOICE_STATUS.SENT as string })
    .eq('id', invoice_id)
    .eq('org_id', invoice.org_id)
    .select('id')

  if (updateError) {
    if (updateError?.code === '42501') {
      authViolation()
    }
    console.error('Error updating invoice status:', updateError)
    operationFailed()
  }

  // Check if RLS silently blocked the update (zero rows returned)
  if (!updatedRows || updatedRows.length === 0) {
    console.error('PILOT_SEND_DEBUG [SERVER] RLS blocked invoice update - zero rows updated:', {
      invoice_id,
      invoice_org_id: invoice.org_id,
      activeOrg_id: activeOrg?.id || null,
      activeOrg_slug: activeOrgSlug,
      pilotAllowed,
    })
    throw new Error('rls_blocked')
  }

  // PILOT_SEND_DEBUG: Log successful update
  console.error('PILOT_SEND_DEBUG [SERVER] Invoice status update SUCCESS:', {
    invoice_id,
    invoice_org_id: invoice.org_id,
    activeOrg_id: activeOrg?.id || null,
    activeOrg_slug: activeOrgSlug,
    pilotAllowed,
    updated_rows_count: updatedRows.length,
  })

  // Step 8: Revalidate invoice pages
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${invoice_id}`)

  return { success: true }
}

