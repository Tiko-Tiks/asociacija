// Supabase Edge Function: Send Email
// This function sends custom emails using Supabase or external email service
//
// To deploy:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref your-project-ref
// 4. Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@branduolys.lt'

serve(async (req) => {
  try {
    const { to, from, subject, html, text } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Option 1: Use Resend (recommended)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: from || EMAIL_FROM,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.text()
        console.error('Resend API error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to send email via Resend', details: error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const result = await resendResponse.json()
      return new Response(
        JSON.stringify({ success: true, id: result.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Option 2: Use Supabase built-in email (if configured)
    // Note: Supabase Auth email is primarily for auth emails
    // For custom emails, you need to use external service or database triggers
    
    // Fallback: Log email (development)
    console.log('EMAIL (logged):', { to, subject, from: from || EMAIL_FROM })
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email logged (no email service configured)',
        note: 'Configure RESEND_API_KEY or other email service'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

