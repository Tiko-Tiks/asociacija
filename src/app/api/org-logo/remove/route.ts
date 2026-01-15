import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/app/actions/_guards'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Remove organization logo
 * 
 * POST /api/org-logo/remove
 * Body: { orgId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireAuth(supabase)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Neprisijungęs vartotojas' },
        { status: 401 }
      )
    }

    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json(
        { error: 'Trūksta organizacijos ID' },
        { status: 400 }
      )
    }

    // Verify user is OWNER of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, member_status')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('member_status', 'ACTIVE')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Nėra prieigos prie šios organizacijos' },
        { status: 403 }
      )
    }

    if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
      return NextResponse.json(
        { error: 'Tik savininkas gali pašalinti logotipą' },
        { status: 403 }
      )
    }

    // Get current logo URL to delete from storage
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('logo_url')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('Error fetching org:', orgError)
    }

    // If logo is in Supabase Storage, try to delete it
    if (org?.logo_url && org.logo_url.includes('storage')) {
      // Extract file path from URL
      const urlParts = org.logo_url.split('/org-logos/')
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split('?')[0]
        await supabase.storage
          .from('org-logos')
          .remove([`org-logos/${fileName}`])
          .catch((err) => {
            console.error('Error deleting logo from storage:', err)
            // Continue even if storage delete fails
          })
      }
    }

    // Update organization to remove logo_url
    const { error: updateError } = await supabase
      .from('orgs')
      .update({ logo_url: null })
      .eq('id', orgId)

    if (updateError) {
      console.error('Error removing org logo:', updateError)
      return NextResponse.json(
        { error: 'Nepavyko pašalinti logotipo' },
        { status: 500 }
      )
    }

    // Log audit (soft mode - don't block on failure)
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        org_id: orgId,
        action: 'REMOVE_ORG_LOGO',
        old_value: { logo_url: org?.logo_url },
        new_value: null,
      })
      
      if (auditError) {
        console.error('AUDIT_LOG_FAILED: Failed to log logo removal', auditError)
      }
    } catch (err) {
      console.error('AUDIT_LOG_FAILED: Failed to log logo removal', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing logo:', error)
    return NextResponse.json(
      { error: 'Įvyko netikėta klaida' },
      { status: 500 }
    )
  }
}

