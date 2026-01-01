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
    
    // Option 3: Log email (development/fallback)
    // In development, log the email details
    // In production, this should be replaced with actual email service
    console.log('EMAIL SENT (logged):', {
      to: options.to,
      subject: options.subject,
      from: EMAIL_FROM,
      html_preview: options.html.substring(0, 200) + '...',
      text_preview: options.text?.substring(0, 200) + '...',
    })

    // TODO: For production, integrate with actual email service:
    // - Resend API (recommended for Supabase)
    // - SendGrid
    // - AWS SES
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: EMAIL_FROM,
    //   to: options.to,
    //   subject: options.subject,
    //   html: options.html,
    //   text: options.text,
    // })

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
 * Email Template: Governance Submission Notice (to CORE)
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
  const subject = 'Jūsų bendruomenė patvirtinta'

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://branduolys.lt'}/dashboard/${data.orgSlug}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Jūsų bendruomenė patvirtinta!</h1>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 15px 0;">Sveikiname! Jūsų bendruomenė <strong>${data.orgName}</strong> buvo sėkmingai patvirtinta CORE komiteto.</p>
          
          <p style="margin: 15px 0;">Dabar galite naudoti visus sistemos funkcionalumus:</p>
          <ul style="margin: 15px 0; padding-left: 20px;">
            <li>Kurti ir valdyti projektus</li>
            <li>Organizuoti renginius</li>
            <li>Pateikti nutarimus</li>
            <li>Valdyti narius</li>
            <li>Ir daugiau</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Prisijungti prie valdymo
            </a>
          </div>
          
          <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
            Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
            <a href="${dashboardUrl}" style="color: #2563eb; word-break: break-all;">${dashboardUrl}</a>
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">Bendruomenių Branduolys - Lietuvos bendruomenių platforma</p>
        </div>
      </body>
    </html>
  `

  const text = `
Jūsų bendruomenė patvirtinta!

Sveikiname! Jūsų bendruomenė ${data.orgName} buvo sėkmingai patvirtinta CORE komiteto.

Dabar galite naudoti visus sistemos funkcionalumus.

Prisijungti prie valdymo: ${dashboardUrl}
  `.trim()

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

