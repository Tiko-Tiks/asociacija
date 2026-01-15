'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react'
import { getPublishedMeetings } from '@/app/actions/published-meetings'
import { getPendingVotesCount } from '@/app/actions/voting'
import Link from 'next/link'

interface ActiveVotesAlertProps {
  orgId: string
  orgSlug: string
}

interface MeetingsData {
  count: number
  totalQuestions: number
  pendingVotes: number
  meetingId?: string
}

export function ActiveVotesAlert({ orgId, orgSlug }: ActiveVotesAlertProps) {
  const [meetingsData, setMeetingsData] = useState<MeetingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<MeetingsData | null>(null)
  const isPollingRef = useRef(false)

  const loadMeetings = useCallback(async () => {
    // Prevent concurrent polling
    if (isPollingRef.current) return
    isPollingRef.current = true
    
    try {
      // Don't set loading to true on subsequent polls to prevent flickering
      if (!dataRef.current) {
        setLoading(true)
      }
      
      const meetings = await getPublishedMeetings(orgId)
      
      // Get only the most recent meeting
      const latestMeeting = meetings.length > 0 ? meetings[0] : null
      
      if (!latestMeeting) {
        if (dataRef.current?.count !== 0) {
          const newData = { count: 0, totalQuestions: 0, pendingVotes: 0 }
          dataRef.current = newData
          setMeetingsData(newData)
        }
        return
      }
      
      const questionCount = latestMeeting.agendaCount || latestMeeting.agendaItems?.length || 0
      
      // Check how many votes the user still needs to cast
      const pendingVotes = await getPendingVotesCount(latestMeeting.meeting.id)
      
      // Only update state if data actually changed (prevents flickering)
      const newData: MeetingsData = {
        count: 1,
        totalQuestions: questionCount,
        pendingVotes,
        meetingId: latestMeeting.meeting.id,
      }
      
      const currentData = dataRef.current
      if (!currentData || 
          currentData.pendingVotes !== newData.pendingVotes ||
          currentData.totalQuestions !== newData.totalQuestions ||
          currentData.meetingId !== newData.meetingId) {
        dataRef.current = newData
        setMeetingsData(newData)
      }
    } catch (error) {
      console.error('Error loading meetings:', error)
      if (!dataRef.current) {
        const newData = { count: 0, totalQuestions: 0, pendingVotes: 0 }
        dataRef.current = newData
        setMeetingsData(newData)
      }
    } finally {
      setLoading(false)
      isPollingRef.current = false
    }
  }, [orgId])

  useEffect(() => {
    loadMeetings()
    
    // Refresh when window gains focus (user returns to tab)
    const handleFocus = () => {
      // Only poll if there are pending votes
      if (dataRef.current?.pendingVotes !== 0) {
        loadMeetings()
      }
    }
    
    // Refresh when storage event fires (vote was cast in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vote-cast' || e.key?.startsWith('vote-cast-')) {
        loadMeetings()
      }
    }
    
    // Refresh when custom event fires (vote was cast in same tab)
    const handleVoteCast = () => {
      loadMeetings()
    }
    
    // Poll for changes every 10 seconds, but only if voting is not complete
    const pollInterval = setInterval(() => {
      // Stop polling if voting is already complete (pendingVotes === 0)
      if (dataRef.current && dataRef.current.pendingVotes === 0) {
        return
      }
      loadMeetings()
    }, 10000) // Increased to 10 seconds
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('vote-cast', handleVoteCast as EventListener)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('vote-cast', handleVoteCast as EventListener)
      clearInterval(pollInterval)
    }
  }, [orgId, loadMeetings])

  // Don't show alert if:
  // - Still loading
  // - No meetings
  // - Voting is complete (pendingVotes === 0) - PublishedMeetingCard shows this status
  if (loading || !meetingsData || meetingsData.count === 0 || meetingsData.pendingVotes === 0) {
    return null
  }

  const { totalQuestions, pendingVotes, meetingId } = meetingsData

  // User still has pending votes
  return (
    <Alert className="border-blue-500 bg-blue-50">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <strong className="text-blue-900">Laukia balsavimas!</strong>{' '}
          <span className="text-blue-900">
            Dar turite balsuoti {pendingVotes} iš {totalQuestions}{' '}
            {totalQuestions === 1 ? 'klausimo' : 'klausimų'}.
          </span>
        </div>
        {meetingId && (
          <Link href={`/dashboard/${orgSlug}/meetings/${meetingId}`}>
            <Button variant="outline" size="sm" className="ml-4 border-blue-300 text-blue-900 hover:bg-blue-100">
              <Calendar className="h-4 w-4 mr-2" />
              Balsuoti
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </AlertDescription>
    </Alert>
  )
}

