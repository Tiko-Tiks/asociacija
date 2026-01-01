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
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Cannot create admin client.'
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

