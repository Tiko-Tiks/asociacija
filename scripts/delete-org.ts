/**
 * Delete organization and all related data
 * Usage: npx tsx scripts/delete-org.ts <org-id or slug>
 * 
 * ⚠️ WARNING: This permanently deletes ALL data!
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
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

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'taip' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 't')
    })
  })
}

async function deleteOrg(identifier: string) {
  console.log('🔍 Ieškoma organizacija:', identifier)
  
  // Find org by ID or slug
  let orgId = identifier
  let orgName = ''
  
  // Check if it's a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(identifier)) {
    // Search by slug
    const { data: org, error } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('slug', identifier)
      .single()
    
    if (error || !org) {
      console.error('❌ Organizacija su slug "' + identifier + '" nerasta.')
      return
    }
    
    orgId = org.id
    orgName = org.name
  } else {
    // Get org name by ID
    const { data: org, error } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', identifier)
      .single()
    
    if (error || !org) {
      console.error('❌ Organizacija su ID "' + identifier + '" nerasta.')
      return
    }
    
    orgName = org.name
  }
  
  console.log('')
  console.log('⚠️  DĖMESIO! Ruošiamasi ištrinti:')
  console.log('   Organizacija: ' + orgName)
  console.log('   ID: ' + orgId)
  console.log('')
  console.log('   Tai ištrins VISUS susijusius duomenis:')
  console.log('   - Susirinkimus ir protokolus')
  console.log('   - Narystes ir sutikimus')
  console.log('   - Nutarimus ir balsavimus')
  console.log('   - Projektus ir idėjas')
  console.log('   - Governance nustatymus')
  console.log('')
  
  const confirmed = await askConfirmation('Ar tikrai norite ištrinti? (taip/ne): ')
  
  if (!confirmed) {
    console.log('❌ Atšaukta.')
    return
  }
  
  console.log('')
  console.log('🗑️  Trinama...')
  
  const deletions: string[] = []
  
  // Delete in order (child tables first)
  const tables = [
    { table: 'vote_entries', fk: 'vote_id', parent: 'votes', parentFk: 'org_id' },
    { table: 'votes', fk: 'org_id' },
    { table: 'meeting_attendance', fk: 'meeting_id', parent: 'meetings', parentFk: 'org_id' },
    { table: 'meeting_agenda_items', fk: 'meeting_id', parent: 'meetings', parentFk: 'org_id' },
    { table: 'meeting_protocols', fk: 'org_id' },
    { table: 'meetings', fk: 'org_id' },
    { table: 'resolutions', fk: 'org_id' },
    { table: 'positions', fk: 'org_id' },
    { table: 'invoices', fk: 'org_id' },
    { table: 'project_members', fk: 'project_id', parent: 'projects', parentFk: 'org_id' },
    { table: 'projects', fk: 'org_id' },
    { table: 'ideas', fk: 'org_id' },
    { table: 'consents', fk: 'membership_id', parent: 'memberships', parentFk: 'org_id' },
    { table: 'memberships', fk: 'org_id' },
    { table: 'governance_configs', fk: 'org_id' },
    { table: 'governance_answers', fk: 'org_id' },
    { table: 'org_rulesets', fk: 'org_id' },
    { table: 'ruleset_versions', fk: 'org_id' },
    { table: 'org_review_requests', fk: 'org_id' },
    { table: 'audit_logs', fk: 'org_id' },
  ]
  
  for (const { table, fk, parent, parentFk } of tables) {
    try {
      let query
      
      if (parent) {
        // Need to delete based on parent table
        const { data: parentIds } = await supabase
          .from(parent)
          .select('id')
          .eq(parentFk!, orgId)
        
        if (parentIds && parentIds.length > 0) {
          const ids = parentIds.map(p => p.id)
          const { error, count } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .in(fk, ids)
          
          if (!error && count && count > 0) {
            deletions.push(`${table}: ${count}`)
          }
        }
      } else {
        const { error, count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .eq(fk, orgId)
        
        if (!error && count && count > 0) {
          deletions.push(`${table}: ${count}`)
        }
      }
    } catch (e) {
      // Table might not exist, continue
    }
  }
  
  // Finally delete the org
  const { error: orgError } = await supabase
    .from('orgs')
    .delete()
    .eq('id', orgId)
  
  if (orgError) {
    console.error('❌ Klaida trinant organizaciją:', orgError.message)
    return
  }
  
  deletions.push('orgs: 1')
  
  console.log('')
  console.log('✅ Organizacija "' + orgName + '" sėkmingai ištrinta!')
  console.log('')
  console.log('📊 Ištrinti įrašai:')
  deletions.forEach(d => console.log('   - ' + d))
}

// Get identifier from command line
const identifier = process.argv[2]

if (!identifier) {
  console.log('Naudojimas: npx tsx scripts/delete-org.ts <org-id arba slug>')
  console.log('')
  console.log('Pavyzdžiai:')
  console.log('  npx tsx scripts/delete-org.ts test-bendruomene')
  console.log('  npx tsx scripts/delete-org.ts 12345678-1234-1234-1234-123456789abc')
  console.log('')
  console.log('💡 Norėdami pamatyti organizacijų sąrašą:')
  console.log('   npx tsx scripts/list-orgs.ts')
  process.exit(0)
}

deleteOrg(identifier)
