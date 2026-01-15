/**
 * Generate consolidated_all.sql from current Supabase database schema
 * 
 * Usage:
 *   node scripts/generate-consolidated-schema.js
 * 
 * This script requires:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (for full access)
 * 
 * OR you can provide connection details interactively
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract database host from Supabase URL
function extractDbHost(supabaseUrl) {
  if (!supabaseUrl) return null;
  
  // Supabase URL format: https://xxxxx.supabase.co
  // Database host format: db.xxxxx.supabase.co
  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;
    const parts = hostname.split('.');
    
    if (parts.length >= 3 && parts[1] === 'supabase') {
      return `db.${parts[0]}.supabase.co`;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// Check if pg_dump is available
function checkPgDump() {
  try {
    execSync('pg_dump --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Generate schema using pg_dump
function generateSchemaWithPgDump(host, port, database, user, password) {
  const outputFile = path.join(__dirname, '..', 'sql', 'consolidated_all.sql');
  
  console.log('Generating schema using pg_dump...');
  console.log(`Host: ${host}`);
  console.log(`Database: ${database}`);
  console.log(`Output: ${outputFile}`);
  console.log('');
  
  try {
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: password };
    
    // Run pg_dump
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} --schema=public --no-owner --no-acl --file "${outputFile}"`;
    
    execSync(command, { 
      env,
      stdio: 'inherit'
    });
    
    console.log('');
    console.log('✓ Schema generated successfully!');
    console.log(`  File: ${outputFile}`);
    
    // Clear password from environment
    delete env.PGPASSWORD;
    
    return true;
  } catch (error) {
    console.error('');
    console.error('✗ Error generating schema:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Generate consolidated_all.sql');
  console.log('='.repeat(60));
  console.log('');
  
  // Check if pg_dump is available
  if (!checkPgDump()) {
    console.error('✗ pg_dump is not installed or not in PATH');
    console.error('');
    console.error('Please install PostgreSQL client tools:');
    console.error('  Windows: Download from https://www.postgresql.org/download/windows/');
    console.error('  macOS: brew install postgresql');
    console.error('  Linux: sudo apt-get install postgresql-client');
    console.error('');
    console.error('Alternatively, use Supabase CLI:');
    console.error('  npm install -g supabase');
    console.error('  supabase db dump --schema public > sql/consolidated_all.sql');
    process.exit(1);
  }
  
  // Try to get connection details from environment
  let host, port = '5432', database = 'postgres', user = 'postgres', password;
  
  if (SUPABASE_URL) {
    const dbHost = extractDbHost(SUPABASE_URL);
    if (dbHost) {
      host = dbHost;
      console.log(`Found Supabase URL: ${SUPABASE_URL}`);
      console.log(`Extracted database host: ${host}`);
      console.log('');
    }
  }
  
  // If we don't have all required info, ask user
  if (!host || !password) {
    console.log('Please provide database connection details:');
    console.log('(You can find these in Supabase Dashboard > Project Settings > Database)');
    console.log('');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    if (!host) {
      host = await question('Database host (e.g., db.xxxxx.supabase.co): ');
    }
    
    const portInput = await question(`Port (default: ${port}): `);
    if (portInput.trim()) port = portInput.trim();
    
    const dbInput = await question(`Database (default: ${database}): `);
    if (dbInput.trim()) database = dbInput.trim();
    
    const userInput = await question(`Username (default: ${user}): `);
    if (userInput.trim()) user = userInput.trim();
    
    password = await question('Password: ');
    
    rl.close();
    console.log('');
  }
  
  if (!host || !password) {
    console.error('✗ Missing required connection details');
    process.exit(1);
  }
  
  // Generate schema
  const success = generateSchemaWithPgDump(host, port, database, user, password);
  
  if (!success) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateSchemaWithPgDump, extractDbHost };

