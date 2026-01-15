import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'
import { randomBytes } from 'crypto'

/**
 * API Route: Community Registration Request
 *
 * NEW FLOW (Two-Step Registration):
 * 1. Saves registration data to community_applications with unique token
 * 2. Sends email with onboarding link (token-based)
 * 3. User completes onboarding and account/org are created
 */

interface RegistrationData {
  communityName: string
  contactPerson?: string
  email: string
  description?: string
  registrationNumber?: string
  address?: string
  usagePurpose?: string
  timestamp: string
}

const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@branduolys.lt'

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
 * Generate unique token for onboarding link
 */
function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationData = await request.json()

    const communityName = data.communityName?.trim()
    const email = data.email?.trim().toLowerCase()
    const contactPerson = data.contactPerson?.trim() || null
    const description = data.description?.trim() || null
    const registrationNumber = data.registrationNumber?.trim() || null
    const address = data.address?.trim() || null
    const usagePurpose = data.usagePurpose?.trim() || null

    // Validate required fields
    if (!communityName || !email) {
      return NextResponse.json(
        { error: 'Trūksta privalomų laukų.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if application already exists for this email
    const { data: existingApp } = await supabase
      .from('community_applications')
      .select('id, status, token, token_expires_at')
      .eq('email', email)
      .maybeSingle()

    // If application exists and is not rejected, return existing token
    if (existingApp && existingApp.status !== 'REJECTED') {
      // Check if token is still valid
      if (existingApp.token && existingApp.token_expires_at) {
        const tokenExpiresAt = new Date(existingApp.token_expires_at)
        if (tokenExpiresAt > new Date()) {
          // Token is still valid, return it
          const onboardingLink = `${getAppUrl()}/onboarding/continue?token=${existingApp.token}`
          return NextResponse.json({
            success: true,
            message: 'Paraiška su šiuo el. paštu jau pateikta. Patikrinkite el. paštą dėl nuorodos.',
            existing: true,
            onboardingLink: onboardingLink,
          })
        }
      }

      // Token expired or missing - create new token
      // Continue with new registration below
    }

    // Generate unique token for onboarding link
    const token = generateToken()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30) // Token valid for 30 days

    // Step 1: Save to community_applications table with token
    const { data: newApplication, error: appError }: any = await supabase
      .from('community_applications')
      .insert({
        community_name: communityName,
        contact_person: contactPerson,
        email,
        description,
        registration_number: registrationNumber,
        address,
        usage_purpose: usagePurpose,
        status: 'PENDING', // Will change to IN_PROGRESS when onboarding starts
        token: token,
        token_expires_at: tokenExpiresAt.toISOString(),
        created_at: data.timestamp,
      })
      .select('id')
      .single()

    if (appError || !newApplication) {
      console.error('Error saving application:', appError)
      return NextResponse.json(
        { error: 'Nepavyko išsaugoti paraiškos.' },
        { status: 500 }
      )
    }

    // Step 2: Send email notification to admin
    const { getRegistrationAdminEmail } = await import('@/lib/email-templates')
    const adminEmail = getRegistrationAdminEmail({
      communityName,
      contactPerson,
      email,
      description,
      registrationNumber,
      address,
      usagePurpose,
      timestamp: data.timestamp,
    })

    await sendEmail({
      to: CORE_ADMIN_EMAIL,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
    })

    // Step 3: Send confirmation email with onboarding link
    const APP_URL = getAppUrl()
    const onboardingLink = `${APP_URL}/onboarding/continue?token=${token}`
    const { getRegistrationConfirmationEmail } = await import('@/lib/email-templates')
    const confirmationEmail = getRegistrationConfirmationEmail({
      communityName,
      email,
      onboardingLink: onboardingLink,
    })

    await sendEmail({
      to: email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      text: confirmationEmail.text,
    })

    return NextResponse.json({
      success: true,
      message: 'Paraiška gauta. Patikrinkite el. paštą dėl tolesnių žingsnių.',
    })
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti paraiškos.' },
      { status: 500 }
    )
  }
}
