'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { addAgendaItem, getAgendaItems, type AgendaItem } from '@/app/actions/meetings'
import { listOrganizationMembers } from '@/app/actions/members'
import { getGovernanceConfig } from '@/app/actions/governance-config'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface AgendaInitialSetupProps {
  meetingId: string
  orgId: string
  membershipId: string
  onComplete: () => void
}

export function AgendaInitialSetup({
  meetingId,
  orgId,
  membershipId,
  onComplete,
}: AgendaInitialSetupProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [existingItems, setExistingItems] = useState<AgendaItem[]>([])
  const [chairmanUserId, setChairmanUserId] = useState<string | null>(null)
  const [secretaryUserId, setSecretaryUserId] = useState<string | null>(null)
  const [chairmanOpen, setChairmanOpen] = useState(false)
  const [secretaryOpen, setSecretaryOpen] = useState(false)
  const [chairmanIsAuto, setChairmanIsAuto] = useState(false)
  const [secretaryIsAuto, setSecretaryIsAuto] = useState(false)
  const [chairmanElectedAtMeeting, setChairmanElectedAtMeeting] = useState(false) // Will be elected at meeting
  const [secretaryElectedAtMeeting, setSecretaryElectedAtMeeting] = useState(false) // Will be elected at meeting
  const [autoCreatedItems, setAutoCreatedItems] = useState(false) // Track if we've already auto-created items

  useEffect(() => {
    loadData()
  }, [meetingId, orgId, membershipId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load existing agenda items
      const items = await getAgendaItems(meetingId)
      setExistingItems(items)

      // If items already exist (especially first 3 mandatory items), skip setup
      // Check if first 3 items exist with expected titles (old or new format)
      const hasFirstThree = items.length >= 3 && 
        items.some(i => i.item_no === 1 && (i.title === 'Susirinkimo pirmininkas' || i.title === 'Susirinkimo pirmininko rinkimai')) &&
        items.some(i => i.item_no === 2 && (i.title === 'Sekretorė' || i.title === 'Susirinkimo sekretorės rinkimai')) &&
        items.some(i => i.item_no === 3 && (i.title === 'Darbotvarkės patvirtinimas' || i.title === 'Rinkimų darbotvarkės patvirtinimas'))
      
      if (hasFirstThree) {
        setLoading(false)
        return
      }
      
      // Check if chairman item already exists (old or new title)
      const hasChairmanItem = items.some(i => i.item_no === 1 && (i.title === 'Susirinkimo pirmininkas' || i.title === 'Susirinkimo pirmininko rinkimai'))
      // Check if secretary item already exists (old or new title)
      const hasSecretaryItem = items.some(i => i.item_no === 2 && (i.title === 'Sekretorė' || i.title === 'Susirinkimo sekretorės rinkimai'))
      // Check if agenda confirmation item already exists
      const hasAgendaConfirmationItem = items.some(i => i.item_no === 3 && (i.title === 'Darbotvarkės patvirtinimas' || i.title === 'Rinkimų darbotvarkės patvirtinimas'))
      
      // Prevent infinite loop: if we've already auto-created items in this session, don't do it again
      if (autoCreatedItems) {
        setLoading(false)
        return
      }

      // Load members
      const membersList = await listOrganizationMembers(membershipId, true)
      setMembers(membersList.map(m => ({
        ...m,
        role: m.role || 'MEMBER'
      })))

      // Try to get chairman from governance config
      try {
        const governanceConfig = await getGovernanceConfig(orgId)
        if (governanceConfig) {
          const answers = governanceConfig as any
          
          // Check meeting_chair_is_org_chair setting
          const chairSetting = answers.meeting_chair_is_org_chair
          if (chairSetting === 'yes_auto') {
            // Automatically assign org chairman
            setChairmanIsAuto(true)
            // Find org chairman from answers or default to OWNER
            const chairmanId = answers.chairman_user_id || answers.chairman_id
            let selectedChairmanId: string | null = null
            if (chairmanId) {
              const chairmanMember = membersList.find(m => m.user_id === chairmanId)
              if (chairmanMember) {
                selectedChairmanId = chairmanMember.user_id
                setChairmanUserId(chairmanMember.user_id)
              } else {
                // Default to OWNER if chairman not found in members
                const owner = membersList.find(m => m.role === 'OWNER')
                if (owner) {
                  selectedChairmanId = owner.user_id
                  setChairmanUserId(owner.user_id)
                }
              }
            } else {
              // Default to OWNER
              const owner = membersList.find(m => m.role === 'OWNER')
              if (owner) {
                selectedChairmanId = owner.user_id
                setChairmanUserId(owner.user_id)
              }
            }
            
            // Automatically create chairman agenda item if it doesn't exist
            if (!hasChairmanItem && selectedChairmanId) {
              const chairman = membersList.find(m => m.user_id === selectedChairmanId)
              if (chairman) {
                const chairmanName = chairman.first_name && chairman.last_name
                  ? `${chairman.first_name} ${chairman.last_name}`
                  : chairman.full_name || 'N/A'
                
                try {
                  await addAgendaItem(
                    meetingId,
                    1,
                    'Susirinkimo pirmininko rinkimai',
                    undefined,
                    `Siūloma išrinkti susirinkimo pirmininku ${chairmanName}. Balsavimas dėl siūlomos kandidatūros.`
                  )
                } catch (error) {
                  console.error('Error auto-creating chairman agenda item:', error)
                }
              }
            }
          } else {
            // Manual selection required
            setChairmanIsAuto(false)
            // Pre-select if chairman_user_id exists
            if (answers.chairman_user_id || answers.chairman_id) {
              const chairmanId = answers.chairman_user_id || answers.chairman_id
              const chairmanMember = membersList.find(m => m.user_id === chairmanId)
              if (chairmanMember) {
                setChairmanUserId(chairmanMember.user_id)
              } else {
                // Default to OWNER if chairman not found in members
                const owner = membersList.find(m => m.role === 'OWNER')
                if (owner) {
                  setChairmanUserId(owner.user_id)
                }
              }
            } else {
              // Default to OWNER
              const owner = membersList.find(m => m.role === 'OWNER')
              if (owner) {
                setChairmanUserId(owner.user_id)
              }
            }
          }
          
          // Check meeting_secretary_selection setting
          const secretarySetting = answers.meeting_secretary_selection
          if (secretarySetting === 'automatic') {
            // Automatically assign secretary
            setSecretaryIsAuto(true)
            // Pre-select secretary if exists in answers, otherwise leave null for user to select
            // (automatic might mean it's assigned later, so we might not have a pre-selection)
            
            // Automatically create secretary agenda item if it doesn't exist
            if (!hasSecretaryItem) {
              try {
                await addAgendaItem(
                  meetingId,
                  2,
                  'Susirinkimo sekretorės rinkimai',
                  undefined,
                  'Siūloma išrinkti susirinkimo sekretorę. Balsavimas dėl siūlomos kandidatūros.'
                )
              } catch (error) {
                console.error('Error auto-creating secretary agenda item:', error)
              }
            }
          } else {
            // Manual selection required (preassigned or elected)
            setSecretaryIsAuto(false)
            // IMPORTANT: Create secretary placeholder item immediately if it doesn't exist
            // This ensures all 3 mandatory items are created, even if user hasn't selected secretary yet
            if (!hasSecretaryItem) {
              try {
                await addAgendaItem(
                  meetingId,
                  2,
                  'Susirinkimo sekretorės rinkimai',
                  undefined,
                  'Siūloma išrinkti susirinkimo sekretorę. Balsavimas dėl siūlomos kandidatūros.'
                )
                console.log('[AgendaInitialSetup] Created secretary placeholder item')
              } catch (error) {
                console.error('Error creating secretary placeholder item:', error)
              }
            }
          }
          
          // After processing chairman and secretary, check if we need to create agenda confirmation item
          // This should be created automatically if any items were auto-created
          // Also create if secretary item was just created as placeholder
          const needsAutoCreation = (chairSetting === 'yes_auto' && !hasChairmanItem) || 
                                    (secretarySetting === 'automatic' && !hasSecretaryItem) ||
                                    (!hasSecretaryItem && secretarySetting !== 'automatic') // Also create if secretary item was just created as placeholder
          
          if (needsAutoCreation) {
            // We're auto-creating items, so also create the agenda confirmation item if needed
            // First, reload items to get current state after chairman/secretary creation
            const currentItems = await getAgendaItems(meetingId)
            const currentHasAgendaConfirmation = currentItems.some(i => i.item_no === 3 && (i.title === 'Darbotvarkės patvirtinimas' || i.title === 'Rinkimų darbotvarkės patvirtinimas'))
            
            if (!currentHasAgendaConfirmation) {
              try {
                await addAgendaItem(
                  meetingId,
                  3,
                  'Darbotvarkės patvirtinimas',
                  undefined,
                  'Patvirtinti susirinkimo darbotvarkę.'
                )
              } catch (error) {
                console.error('Error auto-creating agenda confirmation item:', error)
              }
            }
            
            // Reload items to get final state
            const finalItems = await getAgendaItems(meetingId)
            setExistingItems(finalItems)
            
            // Mark that we've auto-created items to prevent infinite loop
            setAutoCreatedItems(true)
            
            // Call onComplete to refresh parent component
            setTimeout(() => {
              onComplete()
            }, 500)
          }
        } else {
          // Default to manual selection if no governance config
          setChairmanIsAuto(false)
          setSecretaryIsAuto(false)
          const owner = membersList.find(m => m.role === 'OWNER')
          if (owner) {
            setChairmanUserId(owner.user_id)
          }
        }
      } catch (error) {
        console.warn('Failed to load governance config:', error)
        // Default to manual selection
        setChairmanIsAuto(false)
        setSecretaryIsAuto(false)
        const owner = membersList.find(m => m.role === 'OWNER')
        if (owner) {
          setChairmanUserId(owner.user_id)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validation: Check if chairman is required and selected
    if (!chairmanIsAuto && !chairmanUserId) {
      toast({
        title: 'Klaida',
        description: 'Prašome pasirinkti susirinkimo pirmininką',
        variant: 'destructive',
      })
      return
    }

    // Note: Secretary is not required to be selected before creating agenda item
    // If not selected, we'll create a placeholder item that can be updated later
    // This ensures all 3 mandatory items are created

    // Validation: Chairman and secretary cannot be the same person
    if (!chairmanIsAuto && !secretaryIsAuto && chairmanUserId && secretaryUserId && chairmanUserId === secretaryUserId) {
      toast({
        title: 'Klaida',
        description: 'Negalima pasirinkti to paties asmens ir pirmininku, ir sekretoriumi',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Handle chairman agenda item
      if (chairmanElectedAtMeeting) {
        // Will be elected at meeting - no specific candidate
        await addAgendaItem(
          meetingId,
          1,
          'Susirinkimo pirmininko rinkimai',
          undefined,
          'Susirinkimo pirmininkas bus renkamas susirinkimo metu. Kandidatūros siūlomos ir balsavimas vykdomas susirinkime.'
        )
      } else if (chairmanIsAuto && chairmanUserId) {
        // Automatically create chairman agenda item
        const chairman = members.find(m => m.user_id === chairmanUserId)
        if (chairman) {
          const chairmanName = chairman.first_name && chairman.last_name
            ? `${chairman.first_name} ${chairman.last_name}`
            : chairman.full_name || 'N/A'
          
          await addAgendaItem(
            meetingId,
            1,
            'Susirinkimo pirmininko rinkimai',
            undefined,
            `Siūloma išrinkti susirinkimo pirmininku ${chairmanName}. Balsavimas dėl siūlomos kandidatūros.`
          )
        }
      } else if (!chairmanIsAuto && chairmanUserId) {
        // Manual selection - create agenda item
        const chairman = members.find(m => m.user_id === chairmanUserId)
        if (!chairman) {
          throw new Error('Nepavyko rasti pasirinkto pirmininko')
        }
        
        const chairmanName = chairman.first_name && chairman.last_name
          ? `${chairman.first_name} ${chairman.last_name}`
          : chairman.full_name || 'N/A'
        
        await addAgendaItem(
          meetingId,
          1,
          'Susirinkimo pirmininko rinkimai',
          undefined,
          `Siūloma išrinkti susirinkimo pirmininku ${chairmanName}. Balsavimas dėl siūlomos kandidatūros.`
        )
      }

      // Handle secretary agenda item
      if (secretaryElectedAtMeeting) {
        // Will be elected at meeting - no specific candidate
        await addAgendaItem(
          meetingId,
          2,
          'Susirinkimo sekretorės rinkimai',
          undefined,
          'Susirinkimo sekretorė bus renkama susirinkimo metu. Kandidatūros siūlomos ir balsavimas vykdomas susirinkime.'
        )
      } else if (secretaryIsAuto) {
        // Automatically create secretary agenda item
        await addAgendaItem(
          meetingId,
          2,
          'Susirinkimo sekretorės rinkimai',
          undefined,
          'Siūloma išrinkti susirinkimo sekretorę. Balsavimas dėl siūlomos kandidatūros.'
        )
      } else if (!secretaryIsAuto && secretaryUserId) {
        // Manual selection - create agenda item with selected secretary
        const secretary = members.find(m => m.user_id === secretaryUserId)
        if (!secretary) {
          throw new Error('Nepavyko rasti pasirinktos sekretorės')
        }
        
        const secretaryName = secretary.first_name && secretary.last_name
          ? `${secretary.first_name} ${secretary.last_name}`
          : secretary.full_name || 'N/A'
        
        await addAgendaItem(
          meetingId,
          2,
          'Susirinkimo sekretorės rinkimai',
          undefined,
          `Siūloma išrinkti susirinkimo sekretore ${secretaryName}. Balsavimas dėl siūlomos kandidatūros.`
        )
      } else {
        // If secretary is not auto and not selected, create placeholder item
        await addAgendaItem(
          meetingId,
          2,
          'Susirinkimo sekretorės rinkimai',
          undefined,
          'Siūloma išrinkti susirinkimo sekretorę. Balsavimas dėl siūlomos kandidatūros.'
        )
      }

      // 3. Darbotvarkės patvirtinimas
      await addAgendaItem(
        meetingId,
        3,
        'Darbotvarkės patvirtinimas',
        undefined, // No summary
        'Patvirtinti susirinkimo darbotvarkę.'
      )

      toast({
        title: 'Sėkmė',
        description: 'Pradiniai darbotvarkės klausimai sukurti',
      })

      // Wait a bit before calling onComplete to ensure items are saved
      await new Promise(resolve => setTimeout(resolve, 500))
      onComplete()
    } catch (error) {
      console.error('Error creating initial agenda items:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko sukurti pradinių klausimų',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Kraunama...</p>
        </CardContent>
      </Card>
    )
  }

  // If all 3 mandatory items already exist, don't show setup (check old and new titles)
  const hasAllThree = existingItems.length >= 3 &&
    existingItems.some(i => i.item_no === 1 && (i.title === 'Susirinkimo pirmininkas' || i.title === 'Susirinkimo pirmininko rinkimai')) &&
    existingItems.some(i => i.item_no === 2 && (i.title === 'Sekretorė' || i.title === 'Susirinkimo sekretorės rinkimai')) &&
    existingItems.some(i => i.item_no === 3 && (i.title === 'Darbotvarkės patvirtinimas' || i.title === 'Rinkimų darbotvarkės patvirtinimas'))
  
  if (hasAllThree) {
    return null
  }

  const chairman = members.find(m => m.user_id === chairmanUserId)
  const secretary = members.find(m => m.user_id === secretaryUserId)

  const chairmanDisplayName = chairman
    ? (chairman.first_name && chairman.last_name
        ? `${chairman.first_name} ${chairman.last_name}`
        : chairman.full_name || 'N/A')
    : 'Nepasirinkta'

  const secretaryDisplayName = secretary
    ? (secretary.first_name && secretary.last_name
        ? `${secretary.first_name} ${secretary.last_name}`
        : secretary.full_name || 'N/A')
    : 'Nepasirinkta'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Darbotvarkės pradinis nustatymas</CardTitle>
        <CardDescription>
          Pridėkite privalomus pradinius klausimus į darbotvarkę
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Prieš pridėdami kitus klausimus, turite nustatyti susirinkimo pirmininką ir sekretorę.
          </AlertDescription>
        </Alert>

        {/* Chairman Selection */}
        <div className="space-y-2">
          <Label>
            Susirinkimo pirmininkas {chairmanIsAuto ? '(Automatiškai)' : chairmanElectedAtMeeting ? '(Renkama susirinkime)' : '*'}
          </Label>
          
          {/* Option: Will be elected at meeting */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="chairmanElected"
              checked={chairmanElectedAtMeeting}
              onCheckedChange={(checked) => {
                setChairmanElectedAtMeeting(checked === true)
                if (checked) {
                  setChairmanUserId(null) // Clear selection when elected at meeting
                }
              }}
              disabled={chairmanIsAuto}
            />
            <label
              htmlFor="chairmanElected"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Bus renkama susirinkimo metu
            </label>
          </div>
          
          <Popover open={chairmanOpen} onOpenChange={setChairmanOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={chairmanOpen}
                className="w-full justify-between"
                disabled={chairmanIsAuto || chairmanElectedAtMeeting}
              >
                {chairmanElectedAtMeeting ? 'Bus renkama susirinkimo metu' : chairmanDisplayName}
                {!chairmanIsAuto && !chairmanElectedAtMeeting && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Ieškoti nario..." />
                <CommandList>
                  <CommandEmpty>Narių nerasta</CommandEmpty>
                  <CommandGroup>
                    {members.map((member) => {
                      const displayName = member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.full_name || 'N/A'
                      
                      return (
                        <CommandItem
                          key={member.user_id}
                          value={displayName}
                          onSelect={() => {
                            // Validation: Cannot select same person as secretary
                            if (secretaryUserId === member.user_id && !secretaryIsAuto) {
                              toast({
                                title: 'Klaida',
                                description: 'Negalima pasirinkti to paties asmens ir pirmininku, ir sekretoriumi',
                                variant: 'destructive',
                              })
                              return
                            }
                            setChairmanUserId(member.user_id)
                            setChairmanOpen(false)
                          }}
                          disabled={chairmanIsAuto}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              chairmanUserId === member.user_id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {displayName}
                          {member.email && (
                            <span className="ml-2 text-xs text-slate-500">({member.email})</span>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Secretary Selection */}
        <div className="space-y-2">
          <Label>
            Sekretorė {secretaryIsAuto ? '(Automatiškai)' : secretaryElectedAtMeeting ? '(Renkama susirinkime)' : '*'}
          </Label>
          
          {/* Option: Will be elected at meeting */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="secretaryElected"
              checked={secretaryElectedAtMeeting}
              onCheckedChange={(checked) => {
                setSecretaryElectedAtMeeting(checked === true)
                if (checked) {
                  setSecretaryUserId(null) // Clear selection when elected at meeting
                }
              }}
              disabled={secretaryIsAuto}
            />
            <label
              htmlFor="secretaryElected"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Bus renkama susirinkimo metu
            </label>
          </div>
          
          <Popover open={secretaryOpen} onOpenChange={setSecretaryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={secretaryOpen}
                className="w-full justify-between"
                disabled={secretaryIsAuto || secretaryElectedAtMeeting}
              >
                {secretaryElectedAtMeeting ? 'Bus renkama susirinkimo metu' : secretaryDisplayName}
                {!secretaryIsAuto && !secretaryElectedAtMeeting && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Ieškoti nario..." />
                <CommandList>
                  <CommandEmpty>Narių nerasta</CommandEmpty>
                  <CommandGroup>
                    {members.map((member) => {
                      const displayName = member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.full_name || 'N/A'
                      
                      return (
                        <CommandItem
                          key={member.user_id}
                          value={displayName}
                          onSelect={() => {
                            // Validation: Cannot select same person as chairman
                            if (chairmanUserId === member.user_id && !chairmanIsAuto) {
                              toast({
                                title: 'Klaida',
                                description: 'Negalima pasirinkti to paties asmens ir pirmininku, ir sekretoriumi',
                                variant: 'destructive',
                              })
                              return
                            }
                            setSecretaryUserId(member.user_id)
                            setSecretaryOpen(false)
                          }}
                          disabled={secretaryIsAuto}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              secretaryUserId === member.user_id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {displayName}
                          {member.email && (
                            <span className="ml-2 text-xs text-slate-500">({member.email})</span>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || (!chairmanIsAuto && !chairmanUserId && !chairmanElectedAtMeeting)}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kuriama...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sukurti pradinius klausimus
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

