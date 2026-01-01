import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

/**
 * Test Email API Route
 * 
 * Allows testing email sending functionality.
 * Can be used to resend emails that were not sent.
 */

interface TestEmailData {
  to: string
  subject?: string
  testType?: 'admin' | 'confirmation' | 'custom'
  registrationData?: {
    communityName?: string
    contactPerson?: string
    email?: string
    description?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: TestEmailData = await request.json()

    if (!data.to) {
      return NextResponse.json(
        { error: 'Trūksta el. pašto adreso (to)' },
        { status: 400 }
      )
    }

    const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || 'admin@branduolys.lt'

    let emailHtml = ''
    let emailText = ''
    let subject = ''

    // Determine email type
    const { 
      getRegistrationAdminEmail, 
      getRegistrationConfirmationEmail, 
      getTestEmail 
    } = await import('@/lib/email-templates')
    
    let emailTemplate: { subject: string; html: string; text: string }
    
    if (data.testType === 'admin' || (!data.testType && data.registrationData)) {
      // Admin notification email
      emailTemplate = getRegistrationAdminEmail({
        communityName: data.registrationData?.communityName || 'Test Bendruomenė',
        contactPerson: data.registrationData?.contactPerson || null,
        email: data.registrationData?.email || data.to,
        description: data.registrationData?.description || null,
        timestamp: new Date().toISOString(),
      })
      subject = data.subject || emailTemplate.subject
      emailHtml = emailTemplate.html
      emailText = emailTemplate.text

    } else if (data.testType === 'confirmation') {
      // Confirmation email
      emailTemplate = getRegistrationConfirmationEmail({
        communityName: data.registrationData?.communityName || 'Test Bendruomenė',
        email: data.to,
      })
      subject = data.subject || emailTemplate.subject
      emailHtml = emailTemplate.html
      emailText = emailTemplate.text

    } else {
      // Custom/Test email
      emailTemplate = getTestEmail()
      subject = data.subject || emailTemplate.subject
      emailHtml = emailTemplate.html
      emailText = emailTemplate.text
    }

    // Send email
    const result = await sendEmail({
      to: data.to,
      subject,
      html: emailHtml,
      text: emailText,
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Nepavyko išsiųsti email',
          details: 'Patikrinkite serverio console log\'us'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email išsiųstas sėkmingai',
      to: data.to,
      subject
    })
  } catch (error: any) {
    console.error('Error in test-email route:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti užklausos', details: error.message },
      { status: 500 }
    )
  }
}

