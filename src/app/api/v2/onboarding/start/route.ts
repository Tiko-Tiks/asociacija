import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/app-url'
import { sendEmail } from '@/lib/email'
import { logAudit } from '@/app/utils/audit'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 onboarding start with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * API Route: Start Onboarding V2 (Create Account & Org with Magic Link)
 * 
 * V2 Features:
 * - Magic link authentication (no password)
 * - PRE_ORG mode: ONBOARDING status + metadata.fact.pre_org = true
 * - PENDING membership status
 * - Enhanced token validation
 * - Improved audit logging
 * 
 * PRE_ORG Implementation:
 * - Uses ONBOARDING status (schema is frozen; no new enum values)
 * - Requires metadata.fact.pre_org = true flag
 * - All PRE_ORG logic must check: status = 'ONBOARDING' AND metadata.fact.pre_org = true
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
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
    
    // Check if admin API is available
    if (!supabase.auth.admin) {
      console.error('Admin auth API is not available!')
      return NextResponse.json(
        { success: false, error: 'Admin API neprieinamas' },
        { status: 500 }
      )
    }

    // Step 1: Validate token against community_applications
    const { data: application, error: appError }: any = await supabase
      .from('community_applications')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (appError || !application) {
      // Log invalid token attempt
      await logAudit(supabase, {
        orgId: '00000000-0000-0000-0000-000000000000',
        userId: null,
        action: 'INVALID_ONBOARDING_TOKEN',
        targetTable: 'community_applications',
        targetId: null,
        metadata: {
          fact: {
            source: 'community_onboarding_v2',
            token_provided: token ? 'yes' : 'no',
            error: 'application_not_found',
          },
        },
      })

      return NextResponse.json(
        { success: false, error: 'Paraiška nerasta' },
        { status: 404 }
      )
    }

    // Check token expiration
    const tokenExpiresAt = new Date(application.token_expires_at)
    if (tokenExpiresAt < new Date()) {
      await logAudit(supabase, {
        orgId: '00000000-0000-0000-0000-000000000000',
        userId: null,
        action: 'INVALID_ONBOARDING_TOKEN',
        targetTable: 'community_applications',
        targetId: application.id,
        metadata: {
          fact: {
            source: 'community_onboarding_v2',
            error: 'token_expired',
            expires_at: application.token_expires_at,
          },
        },
      })

      return NextResponse.json(
        { success: false, error: 'Nuoroda nebegalioja' },
        { status: 400 }
      )
    }

    // Check application status
    if (application.status !== 'PENDING' && application.status !== 'IN_PROGRESS') {
      await logAudit(supabase, {
        orgId: '00000000-0000-0000-0000-000000000000',
        userId: null,
        action: 'INVALID_ONBOARDING_TOKEN',
        targetTable: 'community_applications',
        targetId: application.id,
        metadata: {
          fact: {
            source: 'community_onboarding_v2',
            error: 'invalid_status',
            current_status: application.status,
            required_status: 'PENDING or IN_PROGRESS',
          },
        },
      })

      return NextResponse.json(
        { success: false, error: `Paraiška turi būti PENDING arba IN_PROGRESS statuso. Dabartinis statusas: ${application.status}` },
        { status: 400 }
      )
    }

    // Step 2: Create user with magic link (no password)
    // Use admin.createUser as TECHNICAL INTERMEDIARY
    let newUser: any
    let userExists = false

    try {
      const { data: createdUser, error: userError } = await supabase.auth.admin.createUser({
        email: application.email,
        email_confirm: true,
        user_metadata: {
          full_name: application.contact_person || application.community_name,
          registration_source: 'community_registration_v2',
        },
      })

      if (userError) {
        // Check if user already exists
        const isUserExistsError = userError?.message?.toLowerCase().includes('already exists') ||
                                   userError?.message?.toLowerCase().includes('user already') ||
                                   userError?.status === 422

        if (isUserExistsError) {
          userExists = true
          // Find existing user by email
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find((u: any) => u.email === application.email)
          
          if (existingUser) {
            newUser = { user: existingUser }
          } else {
            // Try to find via profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', application.email)
              .maybeSingle()

            if (profile) {
              // Get user from auth
              const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
              if (userData?.user) {
                newUser = userData
              }
            }
          }

          if (!newUser?.user) {
            return NextResponse.json(
              { success: false, error: 'Vartotojas jau egzistuoja, bet nepavyko rasti. Susisiekite su administracija.' },
              { status: 400 }
            )
          }
        } else {
          console.error('Error creating user:', userError)
          return NextResponse.json(
            { success: false, error: 'Nepavyko sukurti paskyros' },
            { status: 500 }
          )
        }
      } else {
        newUser = createdUser
      }
    } catch (error) {
      console.error('Error in user creation:', error)
      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti paskyros' },
        { status: 500 }
      )
    }

    if (!newUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti paskyros' },
        { status: 500 }
      )
    }

    // Step 3: Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: newUser.user.id,
          full_name: application.contact_person || application.community_name,
          email: application.email,
        },
        {
          onConflict: 'id',
        }
      )

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      // Non-blocking, but log it
    }

    // Step 4: Generate unique slug
    const baseSlug = generateSlug(application.community_name)
    const uniqueSlug = await generateUniqueSlug(supabase, baseSlug)

    // Step 5: Prepare metadata
    // PRE_ORG is implemented as ONBOARDING + metadata.fact.pre_org
    // Schema is frozen; do NOT add new enum values
    const orgMetadata: any = {
      fact: {
        pre_org: true, // Mandatory flag for PRE_ORG mode
      },
      governance: {
        proposed: {},
      },
    }

    // Add AI metadata if present in application
    if (application.metadata?.ai) {
      orgMetadata.ai = application.metadata.ai
    }

    // Step 6: Create organization with ONBOARDING status
    // PRE_ORG is implemented as ONBOARDING + metadata.fact.pre_org
    // Schema is frozen; do NOT add new enum values
    // All PRE_ORG logic must check: status = 'ONBOARDING' AND metadata.fact.pre_org = true
    const orgData: any = {
      name: application.community_name,
      slug: uniqueSlug,
      status: 'ONBOARDING', // V2: Uses ONBOARDING status with metadata.fact.pre_org = true
      metadata: orgMetadata,
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
      
      // Cleanup: Delete user if org creation failed (only if we created it)
      if (!userExists) {
        try {
          await supabase.auth.admin.deleteUser(newUser.user.id)
        } catch (deleteError) {
          console.error('Error deleting user after org creation failure:', deleteError)
        }
      }

      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti organizacijos' },
        { status: 500 }
      )
    }

    // Step 7: Create membership with PENDING status
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: newOrg.id,
        user_id: newUser.user.id,
        role: 'OWNER',
        member_status: 'PENDING', // V2: PENDING instead of ACTIVE
        joined_at: new Date().toISOString(),
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      
      // Cleanup: Delete org and user
      await supabase.from('orgs').delete().eq('id', newOrg.id)
      if (!userExists) {
        try {
          await supabase.auth.admin.deleteUser(newUser.user.id)
        } catch (deleteError) {
          console.error('Error deleting user after membership creation failure:', deleteError)
        }
      }

      return NextResponse.json(
        { success: false, error: 'Nepavyko sukurti narystės' },
        { status: 500 }
      )
    }

    // Step 8: Update application status to IN_PROGRESS
    await supabase
      .from('community_applications')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', application.id)

    // Step 9: Generate magic link
    const APP_URL = getAppUrl()
    const redirectTo = `${APP_URL}/pre-onboarding/${uniqueSlug}`
    
    let magicLink: string | null = null
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: application.email,
        options: {
          redirectTo: redirectTo,
        },
      })

      if (linkError || !linkData) {
        console.error('Error generating magic link:', linkError)
        // Non-blocking, but we should still send email with instructions
      } else {
        magicLink = linkData.properties.action_link
      }
    } catch (linkError) {
      console.error('Error generating magic link:', linkError)
    }

    // Step 10: Send email with magic link
    try {
      const { getRegistrationConfirmationEmail } = await import('@/lib/email-templates')
      
      const emailData: any = {
        communityName: application.community_name,
        email: application.email,
      }

      if (magicLink) {
        emailData.onboardingLink = magicLink
      } else {
        // Fallback: provide redirect URL and instructions
        emailData.onboardingLink = redirectTo
      }

      const confirmationEmail = getRegistrationConfirmationEmail(emailData)

      await sendEmail({
        to: application.email,
        subject: 'Jūsų paskyra sukurta - Branduolys',
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      })
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError)
    }

    // Step 11: Audit logging
    await logAudit(supabase, {
      orgId: newOrg.id,
      userId: newUser.user.id,
      action: 'SYSTEM_USER_PROVISIONING',
      targetTable: 'orgs',
      targetId: newOrg.id,
      metadata: {
        fact: {
          source: 'community_onboarding_v2',
          pre_org: true, // PRE_ORG mode flag
          pre_org_mode: 'v2', // V2 implementation identifier
          application_id: application.id,
          user_created: !userExists,
        },
      },
    })

    return NextResponse.json({
      success: true,
      orgId: newOrg.id,
      orgSlug: newOrg.slug,
      email: application.email,
      magicLink: magicLink, // Return magic link for client-side use if needed
      redirectTo: redirectTo,
      message: 'Paskyra sukurta sėkmingai. Patikrinkite el. paštą dėl prisijungimo nuorodos.',
    })
  } catch (error) {
    console.error('Error starting onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'Nepavyko pradėti onboarding' },
      { status: 500 }
    )
  }
}
