/**
 * Run SQL queries via Supabase Admin API
 * Usage: npx tsx scripts/run-sql.ts "SELECT * FROM orgs"
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function runQuery(sql: string) {
  console.log('Running SQL:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))
  console.log('---')
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql })
  
  if (error) {
    // Try direct query for simple selects
    if (sql.trim().toLowerCase().startsWith('select')) {
      const tableName = sql.match(/from\s+(\w+)/i)?.[1]
      if (tableName) {
        const { data: selectData, error: selectError } = await supabase
          .from(tableName)
          .select('*')
          .limit(50)
        
        if (selectError) {
          console.error('Error:', selectError.message)
        } else {
          console.table(selectData)
        }
        return
      }
    }
    console.error('Error:', error.message)
    return
  }
  
  console.table(data)
}

// Get SQL from command line
const sql = process.argv[2]

if (!sql) {
  console.log('Usage: npx tsx scripts/run-sql.ts "SELECT * FROM orgs"')
  console.log('')
  console.log('Examples:')
  console.log('  npx tsx scripts/run-sql.ts "SELECT id, name, slug FROM orgs"')
  console.log('  npx tsx scripts/run-sql.ts "SELECT * FROM org_rulesets WHERE status = \'ACTIVE\'"')
  process.exit(0)
}

runQuery(sql)
