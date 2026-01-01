import { createPublicClient } from '@/lib/supabase/public'
import { NextResponse } from 'next/server'

/**
 * Public API Route to get organization by slug
 * 
 * This route uses anon client and should work if RLS allows public access.
 * If RLS blocks, this will return an error that can be debugged.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = 'then' in params ? await params : params
    const slug = decodeURIComponent(resolvedParams.slug).trim()

    const supabase = createPublicClient()

    // Query orgs table (no status column exists)
    const { data: org, error } = await supabase
      .from('orgs')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('API Route Error fetching org:', {
        slug,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      // Return error details for debugging
      return NextResponse.json(
        {
          error: 'Failed to fetch organization',
          details: {
            code: error.code,
            message: error.message,
            hint: error.hint,
            slug,
          },
        },
        { status: 500 }
      )
    }

    if (!org) {
      return NextResponse.json(
        {
          error: 'Organization not found',
          slug,
          note: 'Org might not exist, have wrong status, or RLS is blocking access',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
    })
  } catch (error: any) {
    console.error('API Route Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

