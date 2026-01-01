'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Broadcast Types
 */
export type BroadcastType = 'SISTEMOS_ATNAUJINIMAS' | 'SVARBUS_PRANESIMAS' | 'MARKETINGAS'

export interface BroadcastMessage {
  type: BroadcastType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
}

/**
 * Send global broadcast to all community owners
 * 
 * Creates notifications for all OWNER role memberships.
 */
export async function sendGlobalBroadcast(
  broadcast: BroadcastMessage
): Promise<{ success: boolean; error?: string; notificationsCreated?: number }> {
  const supabase = createAdminClient()

  // Get all OWNER memberships
  const { data: ownerMemberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('user_id, org_id')
    .eq('role', 'OWNER')
    .eq('member_status', 'ACTIVE')

  if (membershipsError) {
    console.error('Error fetching owner memberships:', membershipsError)
    return { success: false, error: membershipsError.message }
  }

  if (!ownerMemberships || ownerMemberships.length === 0) {
    return { success: false, error: 'No owner memberships found' }
  }

  // Create notifications for each owner
  const notifications = ownerMemberships.map((membership) => ({
    user_id: membership.user_id,
    org_id: membership.org_id,
    type: 'BROADCAST',
    title: broadcast.title,
    message: broadcast.message,
    metadata: {
      broadcastType: broadcast.type,
      priority: broadcast.priority,
    },
    read: false,
    created_at: new Date().toISOString(),
  }))

  // Insert notifications (check if notifications table exists)
  const { data: insertedNotifications, error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select('id')

  if (insertError) {
    // If notifications table doesn't exist, log but don't fail
    if (insertError.code === '42P01') {
      console.error('Notifications table does not exist. Skipping broadcast.')
      // TODO: Create notifications table or use alternative storage
      return {
        success: false,
        error: 'Notifications table not configured',
      }
    }
    console.error('Error creating notifications:', insertError)
    return { success: false, error: insertError.message }
  }

  revalidatePath('/admin')
  return {
    success: true,
    notificationsCreated: insertedNotifications?.length || 0,
  }
}

/**
 * Create global announcement (visible on all dashboards)
 * 
 * Stores announcement in system_config or announcements table.
 */
export async function createGlobalAnnouncement(
  announcement: BroadcastMessage
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Try to insert into announcements table (if exists)
  const { error: insertError } = await supabase.from('announcements').insert({
    type: announcement.type,
    title: announcement.title,
    message: announcement.message,
    priority: announcement.priority,
    active: true,
    created_at: new Date().toISOString(),
  })

  if (insertError) {
    // If table doesn't exist, log but don't fail
    if (insertError.code === '42P01') {
      console.error('Announcements table does not exist. Skipping announcement.')
      // TODO: Create announcements table or use alternative storage
      return {
        success: false,
        error: 'Announcements table not configured',
      }
    }
    console.error('Error creating announcement:', insertError)
    return { success: false, error: insertError.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

