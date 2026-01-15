import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { getRegistrationConfirmationEmail } from '@/lib/email-templates'

/**
 * Test endpoint for registration email
 * 
 * GET /api/test-registration-email?to=email@example.com&token=test-token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const to = searchParams.get('to')
    const token = searchParams.get('token') || 'test-token-123'

    if (!to) {
      return NextResponse.json(
        { error: 'Trūksta "to" parametro' },
        { status: 400 }
      )
    }

    const { getAppUrl } = await import('@/lib/app-url')
    const APP_URL = getAppUrl()
    const onboardingLink = `${APP_URL}/onboarding/continue?token=${token}`

    const email = getRegistrationConfirmationEmail({
      communityName: 'Test Bendruomenė',
      email: to,
      onboardingLink: onboardingLink,
    })

    const result = await sendEmail({
      to: to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Email išsiųstas (arba log\'uotas į console)' 
        : 'Email siuntimas nepavyko',
      error: result.error,
      onboardingLink: onboardingLink,
    })
  } catch (error: any) {
    console.error('Error testing email:', error)
    return NextResponse.json(
      { error: error?.message || 'Nepavyko išsiųsti test email' },
      { status: 500 }
    )
  }
}

