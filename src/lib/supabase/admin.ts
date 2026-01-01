import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

/**
 * Create Supabase Admin Client (Service Role)
 * 
 * CRITICAL: This bypasses RLS and has full database access.
 * ONLY use in server-side admin operations.
 * NEVER expose this client to the client-side.
 * 
 * Requires: SUPABASE_SERVICE_ROLE_KEY environment variable
 * 
 * @returns Admin Supabase client with service role
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    // During build time, return a mock client to allow static generation
    // This will fail at runtime if actually used, but allows build to complete
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin client will not work.')
    }
    // Return a client with anon key as fallback (will fail RLS, but allows build)
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

