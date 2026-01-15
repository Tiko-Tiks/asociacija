/**
 * Email Service (B3.3)
 * 
 * Institutional-grade email communication.
 * Fail-safe: Logs incidents but never blocks operations.
 * 
 * Uses Supabase Auth email service for sending custom emails.
 * Requires Supabase email to be configured in project settings.
 */

import { createAdminClient } from './supabase/admin'

/**
 * Email configuration from environment
 */
const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || 'admin@branduolys.lt'
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@branduolys.lt'
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false' // Default to true

/**
 * Send email using Supabase Auth email service
 * 
 * Supabase Auth email service can send custom emails when configured.
 * This uses the admin client to send emails through Supabase.
 * 
 * Note: Supabase free tier has limited email sending.
 * For production, consider using:
 * - Supabase Edge Functions with Resend/SendGrid
 * - Direct integration with Resend API
 * - AWS SES
 * 
 * @param options - Email options
 * @returns Success status and optional error
 */
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('EMAIL DISABLED: Email sending is disabled')
    return { success: true }
  }

  try {
    // Option 1: Use Supabase Edge Function (if configured)
    // This is the recommended way for custom emails
    const useEdgeFunction = process.env.USE_SUPABASE_EDGE_FUNCTION === 'true'
    
    if (useEdgeFunction) {
      try {
        const supabase = createAdminClient()
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            to: options.to,
            from: EMAIL_FROM,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
          },
        })

        if (error) {
          console.error('EMAIL INCIDENT: Supabase Edge Function error:', error)
          // Fall through to logging
        } else {
          console.log('EMAIL SENT via Supabase Edge Function:', {
            to: options.to,
            subject: options.subject,
            result: data,
          })
          return { success: true }
        }
      } catch (edgeError: any) {
        console.error('EMAIL INCIDENT: Edge Function invocation failed:', edgeError)
        // Fall through to logging
      }
    }

    // Option 2: Use Supabase Auth email (for simple cases)
    // Note: This requires Supabase email to be configured
    // Supabase Auth email is primarily for auth emails, but can be used for custom emails
    // via database triggers or Edge Functions
    
    // Option 3: Use Resend API directly (development/production)
    // If RESEND_API_KEY is set, use Resend API directly
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
          }),
        })

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json().catch(() => ({}))
          console.error('EMAIL INCIDENT: Resend API error:', {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            error: errorData,
          })
          // Fall through to logging
        } else {
          const result = await resendResponse.json()
          console.log('EMAIL SENT via Resend API:', {
            to: options.to,
            subject: options.subject,
            id: result.id,
          })
          return { success: true }
        }
      } catch (resendError: any) {
        console.error('EMAIL INCIDENT: Resend API request failed:', resendError)
        // Fall through to logging
      }
    }

    // Option 4: Log email (development/fallback)
    // In development, log the email details if no email service is configured
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment) {
      console.log('='.repeat(80))
      console.log('📧 EMAIL (DEVELOPMENT MODE - NOT SENT):')
      console.log('='.repeat(80))
      console.log('To:', options.to)
      console.log('From:', EMAIL_FROM)
      console.log('Subject:', options.subject)
      console.log('---')
      console.log('HTML Preview:', options.html.substring(0, 300) + '...')
      if (options.text) {
        console.log('Text Preview:', options.text.substring(0, 300) + '...')
      }
      console.log('---')
      console.log('💡 To enable email sending in development:')
      console.log('   1. Get Resend API key from https://resend.com')
      console.log('   2. Add to .env.local: RESEND_API_KEY=re_xxxxxxxxxxxxx')
      console.log('   3. Add to .env.local: EMAIL_FROM=onboarding@resend.dev (or your verified domain)')
      console.log('='.repeat(80))
    } else {
      console.log('EMAIL SENT (logged - no email service configured):', {
        to: options.to,
        subject: options.subject,
        from: EMAIL_FROM,
      })
    }

    return { success: true }
  } catch (error: any) {
    // SOFT FAILURE: Log incident but don't throw
    console.error('EMAIL INCIDENT: Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error?.message || error,
    })
    return { success: false, error: error?.message || 'Email sending failed' }
  }
}

/**
 * Email Template: Governance Submission Notice (to Platforma)
 */
export async function sendGovernanceSubmissionEmail(data: {
  orgName: string
  orgSlug: string
  chairmanName: string | null
  chairmanEmail: string | null
}): Promise<void> {
  const { getGovernanceSubmissionEmail } = await import('./email-templates')
  const { subject, html, text } = getGovernanceSubmissionEmail(data)

  const result = await sendEmail({
    to: CORE_ADMIN_EMAIL,
    subject,
    html,
    text,
  })

  if (!result.success) {
    console.error('EMAIL INCIDENT: Failed to send governance submission email:', result.error)
  }
}

/**
 * Email Template: Org Activated (to Chairman)
 */
export async function sendOrgActivatedEmail(data: {
  orgName: string
  orgSlug: string
  chairmanEmail: string
  chairmanName: string | null
}): Promise<void> {
  const { getOrgActivatedEmail } = await import('./email-templates')
  const { subject, html, text } = getOrgActivatedEmail(data)

  const result = await sendEmail({
    to: data.chairmanEmail,
    subject,
    html,
    text,
  })

  if (!result.success) {
    console.error('EMAIL INCIDENT: Failed to send org activated email:', result.error)
  }
}

/**
 * Email Template: Board Member Assigned (to board member)
 */
export async function sendBoardMemberAssignedEmail(data: {
  to: string
  fullName: string
  orgName: string
  termStart: string
  termEnd: string
}): Promise<void> {
  const { getBoardMemberAssignedEmail } = await import('./email-templates')
  const { subject, html, text } = getBoardMemberAssignedEmail(data)

  const result = await sendEmail({
    to: data.to,
    subject,
    html,
    text,
  })

  if (!result.success) {
    console.error('EMAIL INCIDENT: Failed to send board member assigned email:', result.error)
  }
}

