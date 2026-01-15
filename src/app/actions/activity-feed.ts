'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import type { ActivityItem } from '@/components/member/activity-feed'

/**
 * Get activity feed for member dashboard
 * 
 * v19.0 COMPLIANT:
 * - Reads phase from metadata.fact.phase (NOT from column)
 * - Reads comments from metadata.fact.comments[] (NOT from table)
 * - Uses summary for descriptions
 * - is_snapshot from metadata.fact.is_snapshot
 * - Shows "new comments" indicator for discussions user participated in
 * 
 * Fetches recent:
 * - Ideas (last 7 days)
 * - Active discussions (with participation tracking)
 * - Upcoming events (next 14 days)
 */
export async function getActivityFeed(orgId: string, orgSlug: string): Promise<ActivityItem[]> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const currentUserId = user.id
  
  const items: ActivityItem[] = []
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Fetch in parallel
  const [ideasResult, eventsResult] = await Promise.all([
    // All recent ideas (v19: phase is in metadata, not column)
    supabase
      .from('ideas')
      .select('id, title, summary, status, metadata, created_at')
      .eq('org_id', orgId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),

    // Upcoming events
    supabase
      .from('events')
      .select('id, title, description, event_date')
      .eq('org_id', orgId)
      .gte('event_date', now.toISOString())
      .lte('event_date', fourteenDaysFromNow.toISOString())
      .order('event_date', { ascending: true })
      .limit(5),
  ])

  // Process ideas (v19: extract phase from metadata.fact.phase)
  if (ideasResult.data) {
    for (const idea of ideasResult.data) {
      // v19: Get phase and comments from metadata
      const metadata = idea.metadata || {}
      const fact = metadata.fact || {}
      const phase = fact.phase || 'draft'
      const isSnapshot = fact.is_snapshot === true
      const comments: any[] = fact.comments || []
      
      // Skip snapshots
      if (isSnapshot) continue
      
      const isNew = new Date(idea.created_at).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      const description = idea.summary 
        ? idea.summary.substring(0, 80) + (idea.summary.length > 80 ? '...' : '')
        : null
      
      // Check if current user participated in this discussion
      const userComments = comments.filter((c: any) => c.author_id === currentUserId)
      const userParticipated = userComments.length > 0
      
      // Find user's last comment timestamp
      let newCommentsAfterUser = 0
      if (userParticipated) {
        const lastUserCommentTime = Math.max(
          ...userComments.map((c: any) => new Date(c.created_at).getTime())
        )
        newCommentsAfterUser = comments.filter((c: any) => 
          c.author_id !== currentUserId && 
          new Date(c.created_at).getTime() > lastUserCommentTime
        ).length
      }
      
      // New ideas (draft phase, created recently)
      if (phase === 'draft') {
        items.push({
          id: `idea-${idea.id}`,
          type: 'idea',
          title: idea.title,
          description: description ?? 'Nauja idėja diskusijai',
          date: idea.created_at,
          href: `/dashboard/${orgSlug}/ideas/${idea.id}`,
          isNew,
          requiresAction: false,
        })
      }
      
      // Active discussions - prioritize ones where user participated and has new comments
      if (phase === 'discussion' || phase === 'refined') {
        const hasNewComments = newCommentsAfterUser > 0
        
        items.push({
          id: `discussion-${idea.id}`,
          type: 'comment',
          title: `Diskusija: ${idea.title}`,
          description: hasNewComments 
            ? `${newCommentsAfterUser} nauji komentarai po jūsų`
            : userParticipated 
              ? 'Jūs jau dalyvavote šioje diskusijoje'
              : 'Dalyvaukite diskusijoje ir pasidalinkite nuomone',
          date: idea.created_at,
          href: `/dashboard/${orgSlug}/ideas/${idea.id}`,
          isNew: hasNewComments,
          requiresAction: hasNewComments || !userParticipated,
          actionLabel: hasNewComments ? 'Peržiūrėti' : 'Komentuoti',
        })
      }
      
      // Ready for vote (warning - can become resolution draft)
      if (phase === 'ready_for_vote') {
        items.push({
          id: `ready-${idea.id}`,
          type: 'vote',
          title: `Paruošta sprendimui: ${idea.title}`,
          description: 'Idėja paruošta tapti rezoliucijos projektu',
          date: idea.created_at,
          href: `/dashboard/${orgSlug}/ideas/${idea.id}`,
          requiresAction: false,
        })
      }
    }
  }

  // Process events
  if (eventsResult.data) {
    for (const event of eventsResult.data) {
      const eventDate = new Date(event.event_date)
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.title,
        description: daysUntil <= 3 
          ? `Jau po ${daysUntil} d.!` 
          : event.description?.substring(0, 60),
        date: event.event_date,
        href: `/dashboard/${orgSlug}/governance`,
        isNew: daysUntil <= 3,
        requiresAction: daysUntil <= 3,
        actionLabel: daysUntil <= 3 ? 'Peržiūrėti' : undefined,
      })
    }
  }

  // Sort by requiresAction first, then by date
  items.sort((a, b) => {
    if (a.requiresAction && !b.requiresAction) return -1
    if (!a.requiresAction && b.requiresAction) return 1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return items.slice(0, 10)
}
