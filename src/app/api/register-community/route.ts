import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

/**
 * API Route: Community Registration Request
 * 
 * Receives registration form data and:
 * 1. Saves to database (if applications table exists)
 * 2. Sends email notification to admin
 * 3. Sends confirmation email to applicant
 */

interface RegistrationData {
  communityName: string
  contactPerson: string
  email: string
  description: string
  timestamp: string
}

const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@branduolys.lt'

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

    // 1. Try to save to applications table (if exists)
    try {
      const { error: insertError } = await supabase
        .from('community_applications')
        .insert({
          community_name: data.communityName,
          contact_person: data.contactPerson || null,
          email: data.email,
          description: data.description || null,
          status: 'PENDING',
          created_at: data.timestamp,
        })

      if (insertError && insertError.code !== '42P01') {
        // Table doesn't exist (42P01) is OK, other errors are logged
        console.error('Error saving application to DB:', insertError)
      }
    } catch (dbError) {
      // Table might not exist, continue anyway
      console.log('Applications table not available, skipping DB save')
    }

    // 2. Send email notification to admin
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

    // 3. Send confirmation email to applicant
    const { getRegistrationConfirmationEmail } = await import('@/lib/email-templates')
    const confirmationEmail = getRegistrationConfirmationEmail({
      communityName: data.communityName,
      email: data.email,
    })

    await sendEmail({
      to: data.email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      text: confirmationEmail.text,
    })

    return NextResponse.json({ success: true, message: 'Paraiška gauta' })
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti paraiškos' },
      { status: 500 }
    )
  }
}

