import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/app/actions/_guards'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Upload organization logo to Supabase Storage
 * 
 * POST /api/org-logo/upload
 * Body: FormData with file and orgId
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orgId = formData.get('orgId') as string

    if (!file || !orgId) {
      return NextResponse.json(
        { error: 'Trūksta failo arba organizacijos ID' },
        { status: 400 }
      )
    }

    // Verify file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Failas turi būti paveikslėlis' },
        { status: 400 }
      )
    }

    // Verify file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Failas per didelis. Maksimalus dydis: 5MB' },
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
        { error: 'Tik savininkas gali įkelti logotipą' },
        { status: 403 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${orgId}-${Date.now()}.${fileExt}`
    const filePath = `org-logos/${fileName}`

    // Upload to Supabase Storage
    // Note: Storage bucket 'org-logos' should be created in Supabase Dashboard
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading logo:', uploadError)
      
      // Check if bucket doesn't exist
      if (uploadError.statusCode === '404' || uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket nerastas. Prašome sukurti "org-logos" bucket Supabase Storage.',
            errorCode: 'BUCKET_NOT_FOUND',
            instructions: 'Eikite į Supabase Dashboard → Storage → Create Bucket. Pavadinimas: org-logos, Public: Taip'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Nepavyko įkelti failo: ' + (uploadError.message || 'Nežinoma klaida') },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('org-logos')
      .getPublicUrl(filePath)

    // Update organization logo_url
    const { error: updateError } = await supabase
      .from('orgs')
      .update({ logo_url: publicUrl })
      .eq('id', orgId)

    if (updateError) {
      console.error('Error updating org logo:', updateError)
      
      // Check if error is due to missing column
      if (updateError.code === 'PGRST204' || updateError.message?.includes('logo_url')) {
        // Try to delete uploaded file
        await supabase.storage.from('org-logos').remove([filePath])
        return NextResponse.json(
          { 
            error: 'logo_url stulpelis nerastas. Prašome paleisti SQL migraciją.',
            errorCode: 'COLUMN_NOT_FOUND',
            instructions: 'Paleiskite sql/add_logo_to_orgs.sql Supabase SQL Editor. Žiūrėkite RUN_SQL_MIGRATION.md failą.'
          },
          { status: 500 }
        )
      }
      
      // Try to delete uploaded file
      await supabase.storage.from('org-logos').remove([filePath])
      return NextResponse.json(
        { error: 'Nepavyko atnaujinti logotipo: ' + (updateError.message || 'Nežinoma klaida') },
        { status: 500 }
      )
    }

    // Log audit (soft mode - don't block on failure)
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        org_id: orgId,
        action: 'UPLOAD_ORG_LOGO',
        old_value: null,
        new_value: { logo_url: publicUrl },
      })
      
      if (auditError) {
        console.error('AUDIT_LOG_FAILED: Failed to log logo upload', auditError)
      }
    } catch (err) {
      console.error('AUDIT_LOG_FAILED: Failed to log logo upload', err)
    }

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl,
    })
  } catch (error) {
    console.error('Error in logo upload:', error)
    return NextResponse.json(
      { error: 'Įvyko netikėta klaida' },
      { status: 500 }
    )
  }
}

