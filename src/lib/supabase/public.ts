import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

/**
 * Public Supabase client for anonymous/unauthenticated access.
 * 
 * Use this for public pages that don't require authentication.
 * No cookies, no session, no auth logic - pure anonymous access.
 * 
 * @returns Anonymous Supabase client
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

