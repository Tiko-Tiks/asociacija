import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

/**
 * API Route: Community Registration Request
 * 
 * NEW FLOW:
 * 1. Creates user account automatically
 * 2. Creates organization with PENDING status
 * 3. Assigns user as OWNER
 * 4. Sends email with password and onboarding link
 * 5. Saves to community_applications table
 */

interface RegistrationData {
  communityName: string
  contactPerson: string
  email: string
  description: string
  timestamp: string
}

const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@branduolys.lt'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'https://asociacija.net')

/**
 * Generate slug from organization name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Generate unique slug by appending number if needed
 */
async function generateUniqueSlug(supabase: any, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const { data } = await supabase
      .from('orgs')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    
    if (!data) {
      return slug
    }
    
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

/**
 * Generate random password
 */
function generatePassword(): string {
  return randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationData = await request.json()

    // Validate required fields
    if (!data.communityName || !data.email) {
      return NextResponse.json(
        { error: 'Trūksta privalomų laukų' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(data.email)
    
    if (existingUser?.user) {
      return NextResponse.json(
        { error: 'Vartotojas su šiuo el. paštu jau egzistuoja' },
        { status: 400 }
      )
    }

    // Generate password
    const password = generatePassword()

    // Step 1: Create user account
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: data.contactPerson || data.communityName,
        registration_source: 'community_registration',
      },
    })

    if (userError || !newUser?.user) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: 'Nepavyko sukurti paskyros' },
        { status: 500 }
      )
    }

    // Step 2: Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: data.contactPerson || data.communityName,
        email: data.email,
      })

    if (profileError && profileError.code !== '23505') { // Ignore duplicate key error
      console.error('Error creating profile:', profileError)
      // Continue anyway - profile might exist
    }

    // Step 3: Generate unique slug
    const baseSlug = generateSlug(data.communityName)
    const uniqueSlug = await generateUniqueSlug(supabase, baseSlug)

    // Step 4: Create organization with PENDING status
    const { data: newOrg, error: orgError }: any = await supabase
      .from('orgs')
      .insert({
        name: data.communityName,
        slug: uniqueSlug,
        description: data.description || null,
        status: 'PENDING', // Will be activated after onboarding completion
        created_by: newUser.user.id,
      })
      .select('id, slug, name')
      .single()

    if (orgError || !newOrg) {
      console.error('Error creating organization:', orgError)
      // Try to delete user if org creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Nepavyko sukurti organizacijos' },
        { status: 500 }
      )
    }

    // Step 5: Create membership (OWNER role)
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: newOrg.id,
        user_id: newUser.user.id,
        role: 'OWNER',
        member_status: 'ACTIVE',
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      // Try to clean up
      await supabase.from('orgs').delete().eq('id', newOrg.id)
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Nepavyko sukurti narystės' },
        { status: 500 }
      )
    }

    // Step 6: Save to community_applications table
    try {
      await supabase
        .from('community_applications')
        .insert({
          community_name: data.communityName,
          contact_person: data.contactPerson || null,
          email: data.email,
          description: data.description || null,
          status: 'IN_PROGRESS', // Changed from PENDING to IN_PROGRESS
          created_at: data.timestamp,
        })
    } catch (dbError) {
      // Table might not exist, continue anyway
      console.log('Applications table not available, skipping DB save')
    }

    // Step 7: Send email notification to admin
    const { getRegistrationAdminEmail } = await import('@/lib/email-templates')
    const adminEmail = getRegistrationAdminEmail({
      communityName: data.communityName,
      contactPerson: data.contactPerson || null,
      email: data.email,
      description: data.description || null,
      timestamp: data.timestamp,
    })

    await sendEmail({
      to: CORE_ADMIN_EMAIL,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
    })

    // Step 8: Send welcome email with password and onboarding link
    const onboardingLink = `${APP_URL}/dashboard/${newOrg.slug}/onboarding`
    const { getRegistrationConfirmationEmail } = await import('@/lib/email-templates')
    const confirmationEmail = getRegistrationConfirmationEmail({
      communityName: data.communityName,
      email: data.email,
      onboardingLink: onboardingLink,
      password: password, // Include password in email
    })

    await sendEmail({
      to: data.email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      text: confirmationEmail.text,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Paskyra sukurta. Patikrinkite el. paštą.',
      orgSlug: newOrg.slug,
    })
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti paraiškos' },
      { status: 500 }
    )
  }
}
