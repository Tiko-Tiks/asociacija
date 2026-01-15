import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'
import { randomBytes } from 'crypto'
import { logAudit } from '@/app/utils/audit'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 community registration with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * API Route: Community Registration Request V2
 *
 * V2 Features:
 * - Rate limiting (3 applications per 7 days per email+IP)
 * - Enhanced validation
 * - Optional AI analysis (metadata.ai.*)
 * - Improved audit logging with IP tracking
 * - Metadata namespacing compliance
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

interface RegistrationDataV2 {
  community_name: string
  contact_person?: string
  email: string
  description?: string
  registration_number?: string
  address?: string
  usage_purpose?: string
  statutes?: string // Optional statutes text for AI analysis
}

const CORE_ADMIN_EMAIL = process.env.CORE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@branduolys.lt'
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_DAYS = 7

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string | null {
  // Try various headers (order matters - most trusted first)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  const cfIp = request.headers.get('cf-connecting-ip') // Cloudflare
  if (cfIp) {
    return cfIp.trim()
  }

  return null
}

/**
 * Check rate limit using audit_logs table
 * Returns { allowed: boolean, count: number }
 */
async function checkRateLimit(
  supabase: any,
  email: string,
  ipAddress: string | null
): Promise<{ allowed: boolean; count: number }> {
  if (!ipAddress) {
    // If no IP, allow but log warning
    console.warn('Rate limit check: No IP address available')
    return { allowed: true, count: 0 }
  }

  // Calculate cutoff date (7 days ago)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RATE_LIMIT_WINDOW_DAYS)

  // Query audit_logs for RATE_LIMIT_CHECK actions in last 7 days
  // Filter by email and IP in metadata
  const { data: rateLimitLogs, error } = await supabase
    .from('audit_logs')
    .select('id, metadata')
    .eq('action', 'RATE_LIMIT_CHECK')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Rate limit check error:', error)
    // On error, allow but log
    return { allowed: true, count: 0 }
  }

  // Count applications from this email+IP combination
  let count = 0
  for (const log of rateLimitLogs || []) {
    const metadata = log.metadata || {}
    const fact = metadata.fact || {}
    
    // Check if this log entry is for our email+IP combination
    if (
      fact.email === email &&
      fact.ip_address === ipAddress &&
      fact.decision === 'allow'
    ) {
      count++
    }
  }

  const allowed = count < RATE_LIMIT_MAX

  // Log rate limit check decision
  await logAudit(supabase, {
    orgId: '00000000-0000-0000-0000-000000000000', // System org for rate limiting
    userId: null,
    action: 'RATE_LIMIT_CHECK',
    targetTable: 'community_applications',
    targetId: null,
    metadata: {
      fact: {
        email: email,
        ip_address: ipAddress,
        decision: allowed ? 'allow' : 'deny',
        count: count,
        limit: RATE_LIMIT_MAX,
        window_days: RATE_LIMIT_WINDOW_DAYS,
      },
    },
  })

  return { allowed, count }
}

/**
 * Generate unique token for onboarding link
 */
function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Optional AI analysis of statutes
 * Returns analysis data for metadata.ai.* namespace
 */
async function analyzeStatutes(statutes: string): Promise<{
  summary?: string
  risks?: string[]
  disclaimer: boolean
}> {
  // Placeholder implementation - in production, this would call an AI service
  // For now, return a simple analysis structure
  // IMPORTANT: This is interpretation only, has no legal power
  
  if (!statutes || statutes.trim().length < 50) {
    return { disclaimer: true }
  }

  // Simple placeholder analysis
  const wordCount = statutes.split(/\s+/).length
  const hasArticles = statutes.toLowerCase().includes('straipsnis') || statutes.toLowerCase().includes('article')
  
  return {
    summary: `Document contains approximately ${wordCount} words${hasArticles ? ' with article structure' : ''}.`,
    risks: [
      'AI analysis is interpretative only and has no legal or procedural power.',
      'Human review required for compliance verification.',
    ],
    disclaimer: true,
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationDataV2 = await request.json()

    // Step 1: Validate required fields
    const communityName = data.community_name?.trim()
    const email = data.email?.trim().toLowerCase()

    if (!communityName || !email) {
      return NextResponse.json(
        { error: 'Trūksta privalomų laukų (community_name, email).' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Neteisingas el. pašto formatas.' },
        { status: 400 }
      )
    }

    // Step 2: Get client IP
    const ipAddress = getClientIp(request)

    // Step 3: Rate limiting check
    const supabase = createAdminClient()
    const rateLimitResult = await checkRateLimit(supabase, email, ipAddress)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Per daug paraiškų. Maksimalus skaičius: ${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_DAYS} dienas.`,
          rate_limit_exceeded: true,
          count: rateLimitResult.count,
          limit: RATE_LIMIT_MAX,
        },
        { status: 429 }
      )
    }

    // Step 4: Check for existing active application
    const { data: existingApp } = await supabase
      .from('community_applications')
      .select('id, status, token, token_expires_at')
      .eq('email', email)
      .maybeSingle()

    // If application exists and is not rejected/declined, and token is still valid
    if (existingApp && existingApp.status !== 'REJECTED' && existingApp.status !== 'DECLINED') {
      if (existingApp.token && existingApp.token_expires_at) {
        const tokenExpiresAt = new Date(existingApp.token_expires_at)
        if (tokenExpiresAt > new Date()) {
          // Token is still valid, return existing token
          const onboardingLink = `${getAppUrl()}/onboarding/continue?token=${existingApp.token}`
          return NextResponse.json({
            success: true,
            message: 'Paraiška su šiuo el. paštu jau pateikta. Patikrinkite el. paštą dėl nuorodos.',
            existing: true,
            onboardingLink: onboardingLink,
          })
        }
      }
    }

    // Step 5: Normalize optional fields
    const contactPerson = data.contact_person?.trim() || null
    const description = data.description?.trim() || null
    const registrationNumber = data.registration_number?.trim() || null
    const address = data.address?.trim() || null
    const usagePurpose = data.usage_purpose?.trim() || null
    const statutes = data.statutes?.trim() || null

    // Step 6: Optional AI analysis (if statutes provided)
    let aiAnalysis: any = null
    if (statutes) {
      try {
        aiAnalysis = await analyzeStatutes(statutes)
      } catch (error) {
        console.error('AI analysis error (non-blocking):', error)
        // Continue without AI analysis
      }
    }

    // Step 7: Generate token
    const token = generateToken()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30) // 30 days

    // Step 8: Prepare metadata (namespaced keys only)
    const metadata: any = {
      fact: {
        source: 'community_registration_v2',
        submitted_at: new Date().toISOString(),
      },
    }

    if (ipAddress) {
      metadata.fact.ip_address = ipAddress
    }

    if (aiAnalysis) {
      metadata.ai = {
        summary: aiAnalysis.summary,
        risks: aiAnalysis.risks,
        disclaimer: aiAnalysis.disclaimer,
      }
    }

    // Step 9: Create community_applications row
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
        status: 'PENDING',
        token: token,
        token_expires_at: tokenExpiresAt.toISOString(),
        metadata: metadata,
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

    // Step 10: Send admin notification email
    try {
      const { getRegistrationAdminEmail } = await import('@/lib/email-templates')
      const adminEmail = getRegistrationAdminEmail({
        communityName,
        contactPerson: contactPerson || null,
        email,
        description: description || null,
        registrationNumber: registrationNumber || null,
        address: address || null,
        usagePurpose: usagePurpose || null,
        timestamp: new Date().toISOString(),
      })

      await sendEmail({
        to: CORE_ADMIN_EMAIL,
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
      })
    } catch (emailError) {
      console.error('Error sending admin email (non-blocking):', emailError)
    }

    // Step 11: Send confirmation email to applicant
    try {
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
    } catch (emailError) {
      console.error('Error sending confirmation email (non-blocking):', emailError)
    }

    // Step 12: Audit logging
    await logAudit(supabase, {
      orgId: '00000000-0000-0000-0000-000000000000', // System org for registrations
      userId: null,
      action: 'COMMUNITY_APPLICATION_SUBMITTED',
      targetTable: 'community_applications',
      targetId: newApplication.id,
      metadata: {
        fact: {
          source: 'community_registration_v2',
          email: email,
          community_name: communityName,
          ...(ipAddress && { ip_address: ipAddress }),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Paraiška gauta. Patikrinkite el. paštą dėl tolesnių žingsnių.',
      applicationId: newApplication.id,
    })
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Nepavyko apdoroti paraiškos.' },
      { status: 500 }
    )
  }
}
