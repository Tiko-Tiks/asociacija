/**
 * Centralized Audit Logging Utility
 * 
 * Provides consistent audit logging across the application.
 * Follows soft-fail principle: logs errors but doesn't block operations.
 */

'use server'

import { SupabaseClient } from '@supabase/supabase-js'
import type { AuditLogEntry, AuditResult } from './audit-types'

/**
 * Log an audit entry
 * 
 * This function follows the SOFT AUDIT MODE:
 * - Always returns success (never throws)
 * - Logs errors to console with AUDIT INCIDENT prefix
 * - Does not block the primary operation
 * 
 * @param supabase - Supabase client (authenticated or admin)
 * @param entry - Audit log entry
 * @returns Result object with success flag
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<AuditResult> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        org_id: entry.orgId,
        user_id: entry.userId,
        action: entry.action,
        target_table: entry.targetTable,
        target_id: entry.targetId,
        old_value: entry.oldValue || null,
        new_value: entry.newValue || null,
        metadata: entry.metadata || null,
      })

    if (error) {
      // SOFT AUDIT MODE: Log but don't fail
      console.error(`AUDIT INCIDENT: Failed to log ${entry.action}:`, {
        error,
        code: error.code,
        message: error.message,
        entry: {
          orgId: entry.orgId,
          action: entry.action,
          targetTable: entry.targetTable,
          targetId: entry.targetId,
        },
      })
      return { success: false, error }
    }

    return { success: true }
  } catch (error: any) {
    // SOFT AUDIT MODE: Catch all exceptions
    console.error(`AUDIT INCIDENT: Exception logging ${entry.action}:`, {
      error,
      message: error?.message,
      stack: error?.stack,
      entry: {
        orgId: entry.orgId,
        action: entry.action,
        targetTable: entry.targetTable,
        targetId: entry.targetId,
      },
    })
    return { success: false, error }
  }
}

/**
 * Log multiple audit entries in batch
 * 
 * Useful for operations that affect multiple entities.
 * Each entry is logged independently (one failure doesn't stop others).
 * 
 * @param supabase - Supabase client
 * @param entries - Array of audit log entries
 * @returns Array of results
 */
export async function logAuditBatch(
  supabase: SupabaseClient,
  entries: AuditLogEntry[]
): Promise<AuditResult[]> {
  return Promise.all(entries.map(entry => logAudit(supabase, entry)))
}

