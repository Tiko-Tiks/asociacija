'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface UpdateOrgData {
  name?: string
  slug?: string
  status?: string
}

/**
 * Update organization data (Admin only)
 */
export async function updateOrganizationAdmin(
  orgId: string,
  data: UpdateOrgData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Validate data
  if (data.name && data.name.trim().length === 0) {
    return { success: false, error: 'Pavadinimas negali būti tuščias' }
  }

  if (data.slug && data.slug.trim().length === 0) {
    return { success: false, error: 'Slug negali būti tuščias' }
  }

  // Check if slug is already taken (if changing)
  if (data.slug) {
    const { data: existingOrg } = await supabase
      .from('orgs')
      .select('id')
      .eq('slug', data.slug)
      .neq('id', orgId)
      .maybeSingle()

    if (existingOrg) {
      return { success: false, error: 'Slug jau naudojamas' }
    }
  }

  // Update organization
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.slug !== undefined) updateData.slug = data.slug.trim()
  if (data.status !== undefined) updateData.status = data.status

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return { success: true }
  }

  const { data: updatedOrg, error } = await supabase
    .from('orgs')
    .update(updateData)
    .eq('id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Error updating organization:', error)
    return { success: false, error: error.message }
  }

  if (!updatedOrg) {
    console.error('No organization found after update')
    return { success: false, error: 'Organizacija nerasta po atnaujinimo' }
  }

  console.log('ORG_UPDATE_SUCCESS:', {
    orgId,
    updatedFields: Object.keys(updateData),
    newData: updatedOrg,
  })

  // Audit logging (soft mode)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        org_id: orgId,
        user_id: user.id,
        action: 'ORG_UPDATED',
        target_table: 'orgs',
        target_id: orgId,
        old_value: null,
        new_value: updateData,
      })

    if (auditError) {
      console.error('AUDIT INCIDENT: Failed to log ORG_UPDATED:', auditError)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')

  return { success: true }
}

