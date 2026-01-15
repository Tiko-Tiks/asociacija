import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API Route: Get Application by Token
 *
 * Public endpoint to fetch application data using token from email link.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Trūksta token.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: application, error } = await supabase
      .from('community_applications')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (error || !application) {
      return NextResponse.json(
        { success: false, error: 'Paraiška nerasta.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error) {
    console.error('Error fetching application:', error)
    return NextResponse.json(
      { success: false, error: 'Nepavyko gauti paraiškos.' },
      { status: 500 }
    )
  }
}
