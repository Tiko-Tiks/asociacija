'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Vote, AlertCircle, CheckCircle2, Clock, FileText, Calendar, MoreVertical, Eye } from 'lucide-react'
import { getActiveVotesForMember, type Vote as VoteType } from '@/app/actions/voting'
import { VoteModal } from './vote-modal'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'

interface ActiveVote extends VoteType {
  resolution_title: string
  meeting_title: string | null
  has_voted: boolean
}

interface ActiveVotesClientProps {
  orgId: string
  orgSlug: string
  initialVotes: ActiveVote[]
}

export function ActiveVotesClient({ orgId, orgSlug, initialVotes }: ActiveVotesClientProps) {
  const [votes, setVotes] = useState<ActiveVote[]>(initialVotes)
  const [selectedVote, setSelectedVote] = useState<ActiveVote | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshVotes = async () => {
    setLoading(true)
    try {
      const updatedVotes = await getActiveVotesForMember(orgId)
      setVotes(updatedVotes)
    } catch (error) {
      console.error('Error refreshing votes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Refresh votes every 30 seconds
    const interval = setInterval(refreshVotes, 30000)
    return () => clearInterval(interval)
  }, [orgId])

  const handleVoteClick = (vote: ActiveVote) => {
    setSelectedVote(vote)
  }

  const handleVoteSubmitted = () => {
    refreshVotes()
    setSelectedVote(null)
  }

  const activeVotesCount = votes.filter(v => !v.has_voted).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Balsavimai</h1>
        <p className="text-slate-600 mt-1">Aktyvūs balsavimai, kuriuose galite dalyvauti</p>
      </div>

      {/* Alert for active votes */}
      {activeVotesCount > 0 && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Dėmesio!</strong> Jūs turite {activeVotesCount} {activeVotesCount === 1 ? 'aktyvų balsavimą' : 'aktyvių balsavimų'}, kuriuose dar nebalsavote. 
            Prašome susipažinti su balsavimais ir pateikti savo balsą.
          </AlertDescription>
        </Alert>
      )}

      {/* Votes List */}
      {votes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Vote className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nėra aktyvių balsavimų
            </h3>
            <p className="text-slate-600">
              Šiuo metu nėra aktyvių balsavimų, kuriuose galėtumėte dalyvauti.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {votes.map((vote) => (
            <div
              key={vote.id}
              className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                !vote.has_voted ? 'border-l-4 border-l-amber-500' : ''
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => handleVoteClick(vote)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-slate-900 truncate">
                      {vote.resolution_title}
                    </h4>
                    {vote.has_voted ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Balsavote
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Laukia jūsų balso
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                    {vote.meeting_title && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {vote.meeting_title}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {vote.kind === 'GA' ? 'Bendrasis susirinkimas' : 'Nuomonės klausimas'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>
                      Pradėtas: {format(new Date(vote.opens_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                    </span>
                    {vote.closes_at && (
                      <span>
                        Baigiasi: {format(new Date(vote.closes_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Atidaryti meniu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleVoteClick(vote)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {vote.has_voted ? 'Peržiūrėti' : 'Balsuoti'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Vote Modal */}
      {selectedVote && (
        <VoteModal
          vote={selectedVote}
          orgId={orgId}
          orgSlug={orgSlug}
          onClose={() => setSelectedVote(null)}
          onVoteSubmitted={handleVoteSubmitted}
        />
      )}
    </div>
  )
}

