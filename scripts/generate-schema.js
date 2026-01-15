/**
 * Generate Full Database Schema
 * 
 * This script connects to Supabase and generates a complete SQL schema dump
 * Run with: node scripts/generate-schema.js > sql/consolidated_all.sql
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateSchema() {
  console.log('-- ==================================================');
  console.log('-- Full Database Schema Dump');
  console.log('-- Generated:', new Date().toISOString());
  console.log('-- ==================================================\n');

  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    // Get all enum types
    const { data: enums, error: enumsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          t.typname as enum_name,
          string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        GROUP BY t.typname
        ORDER BY t.typname;
      `
    });

    // Get all functions
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
      `
    });

    // Get all views
    const { data: views, error: viewsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          table_name,
          view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `
    });

    // Get all RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });

    // Output schema
    console.log('-- ==================================================');
    console.log('-- ENUM TYPES');
    console.log('-- ==================================================\n');
    
    if (enums && enums.length > 0) {
      enums.forEach(enumType => {
        console.log(`CREATE TYPE ${enumType.enum_name} AS ENUM (`);
        const values = enumType.enum_values.split(',').map(v => `  '${v}'`).join(',\n');
        console.log(values);
        console.log(');\n');
      });
    }

    console.log('-- ==================================================');
    console.log('-- TABLES');
    console.log('-- ==================================================\n');

    // For each table, get its structure
    for (const table of tables || []) {
      const { data: columns, error: colsError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            column_name,
            data_type,
            udt_name,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_schema = '${table.schemaname}' 
            AND table_name = '${table.tablename}'
          ORDER BY ordinal_position;
        `
      });

      if (colsError) {
        console.error(`Error fetching columns for ${table.tablename}:`, colsError);
        continue;
      }

      console.log(`-- Table: ${table.tablename}`);
      console.log(`CREATE TABLE IF NOT EXISTS ${table.tablename} (`);
      
      const colDefs = columns.map(col => {
        let def = `  ${col.column_name} `;
        
        if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else if (col.data_type === 'ARRAY') {
          def += col.udt_name + '[]';
        } else {
          def += col.data_type;
        }
        
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision && col.numeric_scale) {
          def += `(${col.numeric_precision},${col.numeric_scale})`;
        } else if (col.numeric_precision) {
          def += `(${col.numeric_precision})`;
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        return def;
      }).join(',\n');
      
      console.log(colDefs);
      console.log(');\n');
    }

    console.log('-- ==================================================');
    console.log('-- FUNCTIONS');
    console.log('-- ==================================================\n');
    
    if (functions && functions.length > 0) {
      functions.forEach(func => {
        console.log(`-- Function: ${func.function_name}`);
        console.log(func.function_def);
        console.log('\n');
      });
    }

    console.log('-- ==================================================');
    console.log('-- VIEWS');
    console.log('-- ==================================================\n');
    
    if (views && views.length > 0) {
      views.forEach(view => {
        console.log(`-- View: ${view.table_name}`);
        console.log(`CREATE OR REPLACE VIEW ${view.table_name} AS`);
        console.log(view.view_definition);
        console.log(';\n');
      });
    }

    console.log('-- ==================================================');
    console.log('-- RLS POLICIES');
    console.log('-- ==================================================\n');
    
    if (policies && policies.length > 0) {
      policies.forEach(policy => {
        console.log(`-- Policy: ${policy.tablename}.${policy.policyname}`);
        console.log(`CREATE POLICY "${policy.policyname}" ON ${policy.tablename}`);
        console.log(`  FOR ${policy.cmd}`);
        console.log(`  TO ${policy.roles}`);
        if (policy.qual) {
          console.log(`  USING (${policy.qual})`);
        }
        if (policy.with_check) {
          console.log(`  WITH CHECK (${policy.with_check})`);
        }
        console.log(';\n');
      });
    }

  } catch (error) {
    console.error('Error generating schema:', error);
    process.exit(1);
  }
}

generateSchema();

