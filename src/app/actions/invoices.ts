'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { requireOrgActive } from '@/app/domain/guards/orgActivation'
import { InvoiceStatus } from '@/app/domain/types'
import { MEMBERSHIP_STATUS, MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Server Action to list organization invoices.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - RLS enforces user can only see invoices of their own org
 * - Joins with profiles via membership to show member names
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Array of invoices with member info
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if query fails
 */
export async function listOrganizationInvoices(
  membership_id: string
): Promise<
  Array<{
    id: string
    amount: number
    description: string | null
    due_date: string
    status: InvoiceStatus
    member_name: string | null
    membership_id: string
    created_at: string
  }>
> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Get user's membership to derive org_id
  // RLS will enforce user can only see their own membership
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Query invoices for this org via membership join
  // RLS on invoices will enforce user can only see invoices of their org
  // Join with memberships to filter by org_id
  const { data: invoices, error: invoicesError }: any = await supabase
    .from('invoices')
    .select('id, amount, description, due_date, status, membership_id, created_at, memberships!inner(org_id)')
    .eq('memberships.org_id', membership.org_id)
    .order('created_at', { ascending: false })

  if (invoicesError) {
    // Check if error is due to RLS violation
    if (invoicesError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  if (!invoices || invoices.length === 0) {
    return []
  }

  // Step 4: Query memberships and profiles for member names
  // PRIVACY: Select ONLY id, full_name from profiles (NO email per .cursorrules 1.3)
  const membershipIds = invoices.map((inv: any) => inv.membership_id)
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('id, profiles!inner(id, full_name)')
    .in('id', membershipIds)

  if (membershipsError) {
    // Check if error is due to RLS violation
    if (membershipsError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Step 5: Create a map of membership_id -> member name
  const memberNameMap = new Map(
    (memberships || []).map((m: any) => [m.id, m.profiles?.full_name || null])
  )

  // Transform data to include member names
  return (invoices || []).map((invoice: any) => ({
    id: invoice.id,
    amount: invoice.amount || 0,
    description: invoice.description || null,
    due_date: invoice.due_date,
    status: invoice.status as InvoiceStatus,
    member_name: memberNameMap.get(invoice.membership_id) || null,
    membership_id: invoice.membership_id,
    created_at: invoice.created_at,
  }))
}

/**
 * Server Action to generate annual invoices for an organization.
 * 
 * Calls the database RPC function `generate_annual_invoices`.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Validates user has active membership in the target org
 * - RPC handles the actual invoice generation logic
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Number of invoices created
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if RPC call fails
 */
export async function generateInvoices(
  membership_id: string
): Promise<number> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Get user's membership to derive org_id (SOURCE OF TRUTH)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Call RPC function
  // RPC security is handled by the database function itself
  const { data, error }: any = await (supabase.rpc as any)('generate_annual_invoices', {
    target_org_id: membership.org_id,
  })

  if (error) {
    // Check if error is due to RLS/auth violation
    if (error?.code === '42501') {
      authViolation()
    }
    // Log error for debugging but throw generic error to client
    console.error('RPC generate_annual_invoices failed:', error)
    operationFailed()
  }

  // RPC should return the count of invoices created
  // Handle case where RPC returns null or undefined
  const count = typeof data === 'number' ? data : 0

  return count
}

/**
 * Server Action to manually create a financial entry (invoice).
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Validates user has active membership
 * - Creates invoice record with provided data
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param amount - Invoice amount
 * @param description - Invoice description
 * @param due_date - Due date for the invoice
 * @returns Standard response with success flag and data/error
 */
export async function createInvoice(
  membership_id: string,
  amount: number,
  description: string,
  due_date: string
): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 1: Check org activation (CRITICAL)
  try {
    await requireOrgActive(membership.org_id)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Organizacija nėra aktyvi. Prašome užbaigti aktyvacijos procesą.' }
    }
    throw error
  }

  // Insert invoice record
  // Use the provided membership_id (could be the owner's or another member's)
  // RLS will enforce access control
  const { data: invoice, error: insertError }: any = await (supabase
    .from('invoices') as any)
    .insert({
      org_id: membership.org_id,
      membership_id: membership_id,
      amount: amount,
      description: description.trim() || null,
      due_date: due_date,
      status: 'SENT' as InvoiceStatus, // Default status for manual entries
    })
    .select('id')
    .single()

  if (insertError || !invoice) {
    if (insertError?.code === '42501') {
      return { success: false, error: 'Access denied' }
    }
    console.error('SERVER ACTION ERROR: createInvoice', insertError)
    return { 
      success: false, 
      error: insertError?.message || 'Failed to create invoice' 
    }
  }

  revalidatePath('/dashboard/invoices')
  return { success: true, data: { id: invoice.id } }
}

/**
 * Server Action to update invoice status (e.g., DRAFT → SENT).
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id ONLY from invoice record (source of truth)
 * - Resolves ACTIVE membership server-side
 * - Verifies role === OWNER
 * - Ignores membership_id from client if present
 * 
 * @param invoice_id - UUID of the invoice to update
 * @param new_status - New status value (e.g., 'SENT')
 * @param membership_id - DEPRECATED: Kept for backwards compatibility, ignored
 * @returns Success indicator
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateInvoiceStatus(
  invoice_id: string,
  new_status: InvoiceStatus,
  membership_id?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // CRITICAL: Ignore membership_id parameter - derive org from invoice record
  // Step 1: Fetch invoice by invoice_id → extract invoice.org_id (STRICT SOURCE OF TRUTH)
  // org_id MUST be derived from invoices table, NEVER from client input
  const { data: invoice, error: invoiceError }: any = await supabase
    .from('invoices')
    .select('id, org_id')
    .eq('id', invoice_id)
    .single()

  if (invoiceError) {
    if (invoiceError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching invoice:', invoiceError)
    operationFailed()
  }

  if (!invoice || !invoice.org_id) {
    console.error('Invoice not found or missing org_id:', invoice_id)
    operationFailed()
  }

  // Step 1.5: Check org activation (CRITICAL)
  await requireOrgActive(invoice.org_id)

  // Step 2-3: Verify user is ACTIVE OWNER using consolidated guard
  // This replaces the manual membership query + role checks
  const { requireOwner } = await import('@/app/domain/guards/membership')
  await requireOwner(supabase, user.id, invoice.org_id)

  // Step 4: Update invoice status (guard passed - user is ACTIVE OWNER in invoice.org_id)
  const { error: updateError }: any = await supabase
    .from('invoices')
    .update({ status: new_status })
    .eq('id', invoice_id)

  if (updateError) {
    if (updateError?.code === '42501') {
      authViolation()
    }
    console.error('Error updating invoice status:', updateError)
    operationFailed()
  }

  // Step 5: Revalidate invoice pages
  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${invoice_id}`)

  return { success: true }
}

