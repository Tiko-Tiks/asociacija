import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = await createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all Supabase cookies
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  for (const cookie of allCookies) {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookieStore.delete(cookie.name)
    }
  }
  
  // Redirect to home
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}

export async function POST() {
  return GET()
}

