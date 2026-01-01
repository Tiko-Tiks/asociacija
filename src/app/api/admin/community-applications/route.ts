import { NextRequest, NextResponse } from 'next/server'
import { getCommunityApplications } from '@/app/actions/admin'

/**
 * API Route: Get Community Applications (Admin)
 * 
 * Returns all community registration requests for admin review.
 */
export async function GET(request: NextRequest) {
  try {
    const applications = await getCommunityApplications()

    return NextResponse.json({
      success: true,
      applications,
    })
  } catch (error: any) {
    console.error('Error fetching community applications:', error)
    
    // Check if it's an auth error
    if (error?.message?.includes('auth') || error?.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Nėra prieigos' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Nepavyko gauti registracijų' },
      { status: 500 }
    )
  }
}

