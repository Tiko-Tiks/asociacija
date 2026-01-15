/**
 * List all organizations
 * Usage: npx tsx scripts/list-orgs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    })
  } catch (e) {
    // .env.local might not exist
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function listOrgs() {
  console.log('📋 Organizacijų sąrašas:\n')
  
  const { data: orgs, error } = await supabase
    .from('orgs')
    .select('id, name, slug, status, created_at')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Klaida:', error.message)
    return
  }
  
  if (!orgs || orgs.length === 0) {
    console.log('Organizacijų nerasta.')
    return
  }
  
  console.table(orgs.map(o => ({
    ID: o.id.substring(0, 8) + '...',
    Pavadinimas: o.name,
    Slug: o.slug,
    Statusas: o.status,
    Sukurta: new Date(o.created_at).toLocaleDateString('lt-LT')
  })))
  
  console.log('\n💡 Norėdami ištrinti organizaciją, naudokite:')
  console.log('   npx tsx scripts/delete-org.ts <org-id arba slug>')
}

listOrgs()
