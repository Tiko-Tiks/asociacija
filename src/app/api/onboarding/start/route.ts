import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { randomBytes } from 'crypto'

/**
 * API Route: Start Onboarding (Create Account & Org)
 * 
 * Creates user account, organization, and membership based on application token.
 * This is called when user clicks "Start Onboarding" button.
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

function generatePassword(): string {
  return randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Trūksta token' },
        { status: 400 }
      )
    }

    // Check if service role key is set
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set!')
      return NextResponse.json(
        { success: false, error: 'Serverio konfigūracijos klaida' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()
    
    // Debug: Check if admin API is available
    if (!supabase.auth.admin) {
      console.error('Admin auth API is not available!')
      return NextResponse.json(
        { success: false, error: 'Admin API neprieinamas' },
        { status: 500 }
      )
    }

    // Fetch application by token
    const { data: application, error: appError }: any = await supabase
      .from('community_applications')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: 'Paraiška nerasta' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (new Date(application.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Nuoroda nebegalioja' },
        { status: 400 }
      )
    }

    // Generate password
    const password = generatePassword()

    // Step 1: Try to create user account
    // If user already exists, we'll handle it by finding the existing user
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: application.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: application.contact_person || application.community_name,
        registration_source: 'community_registration',
      },
    })

    // If user creation failed, check if it's because user already exists
    if (userError || !newUser?.user) {
      // Check if error is due to existing user
      const isUserExistsError = userError?.message?.toLowerCase().includes('already exists') ||
                                 userError?.message?.toLowerCase().includes('user already') ||
                                 userError?.status === 422

      if (isUserExistsError) {
        // User already exists - find them via profiles table (much faster than listUsers)
        try {
          // Find user by email in profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', application.email)
            .maybeSingle()

          if (profile) {
            // User exists - find org
            const { data: membership } = await supabase
              .from('memberships')
              .select('org_id')
              .eq('user_id', profile.id)
              .eq('member_status', 'ACTIVE')
              .maybeSingle()

            if (membership) {
              // Org exists - return it
              const { data: org } = await supabase
                .from('orgs')
                .select('id, slug')
                .eq('id', membership.org_id)
                .maybeSingle()

              if (org) {
                // Update application status to IN_PROGRESS
                await supabase
                  .from('community_applications')
                  .update({ status: 'IN_PROGRESS' })
                  .eq('id', application.id)

                return NextResponse.json({
                  success: true,
                  orgId: org.id,
                  orgSlug: org.slug,
                  email: application.email,
                  password: null, // Don't return password for existing user
                  message: 'Paskyra jau egzistuoja',
                })
              }
            }
          }
        } catch (findError) {
          console.error('Error finding existing user:', findError)
        }
        
        // If we couldn't find the user or org, return error
        return NextResponse.json(
          { success: false, error: 'Vartotojas jau egzistuoja, bet nepavyko rasti organizacijos. Susisiekite su administracija.' },
          { status: 400 }
        )
      }

      // If it's not a "user exists" error, or we couldn't find the existing user, return error
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti paskyros' },
        { status: 500 }
      )
    }

    // Step 2: Create profile
    await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: application.contact_person || application.community_name,
        email: application.email,
      })

    // Step 3: Generate unique slug
    const baseSlug = generateSlug(application.community_name)
    const uniqueSlug = await generateUniqueSlug(supabase, baseSlug)

    // Step 4: Create organization with ONBOARDING status
    // Include registration details from application (if columns exist)
    const orgData: any = {
      name: application.community_name,
      slug: uniqueSlug,
      status: 'ONBOARDING', // Status during onboarding process
    }
    
    // Add optional fields if they exist in application
    if (application.registration_number) {
      orgData.registration_number = application.registration_number
    }
    if (application.address) {
      orgData.address = application.address
    }
    if (application.usage_purpose) {
      orgData.usage_purpose = application.usage_purpose
    }
    
    const { data: newOrg, error: orgError }: any = await supabase
      .from('orgs')
      .insert(orgData)
      .select('id, slug, name')
      .single()

    if (orgError || !newOrg) {
      console.error('Error creating organization:', orgError)
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti organizacijos' },
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
      await supabase.from('orgs').delete().eq('id', newOrg.id)
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti narystės' },
        { status: 500 }
      )
    }

    // Step 6: Update application status to IN_PROGRESS
    await supabase
      .from('community_applications')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', application.id)

    // Step 7: Send welcome email with password
    const { sendEmail } = await import('@/lib/email')
    const { getRegistrationConfirmationEmail } = await import('@/lib/email-templates')
    const APP_URL = getAppUrl()
    const dashboardLink = `${APP_URL}/dashboard/${newOrg.slug}/onboarding`

    const welcomeEmail = getRegistrationConfirmationEmail({
      communityName: application.community_name,
      email: application.email,
      onboardingLink: dashboardLink,
      password: password,
    })

    await sendEmail({
      to: application.email,
      subject: 'Jūsų paskyra sukurta - Branduolys',
      html: welcomeEmail.html,
      text: welcomeEmail.text,
    })

    // Step 8: Generate session token for automatic login
    // Note: In production, you might want to use a more secure method
    // For now, we'll return the password and let the client handle login
    // Or we can create a temporary session token

    return NextResponse.json({
      success: true,
      orgId: newOrg.id,
      orgSlug: newOrg.slug,
      email: application.email,
      password: password, // Return password for client-side login
      message: 'Paskyra sukurta sėkmingai',
    })
  } catch (error) {
    console.error('Error starting onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'Nepavyko pradėti onboarding' },
      { status: 500 }
    )
  }
}

