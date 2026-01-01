"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { assignPosition } from '@/app/actions/positions-assign'
import { getGovernanceConfig } from '@/app/actions/governance-config'
import { useRouter } from 'next/navigation'
import { LogoSpinner } from '@/components/ui/logo-spinner'

interface AssignPositionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userId: string
  userName: string | null
}

// Position types
const POSITION_TYPES = [
  { value: 'Narys', label: 'Narys' },
  { value: 'Tarybos narys', label: 'Tarybos narys' },
  { value: 'Valdybos narys', label: 'Valdybos narys' },
  { value: 'Pirmininkas', label: 'Pirmininkas' },
] as const

export function AssignPositionModal({
  open,
  onOpenChange,
  orgId,
  userId,
  userName,
}: AssignPositionModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [governanceConfig, setGovernanceConfig] = useState<Record<string, any> | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Load governance config when modal opens
  useEffect(() => {
    if (open && orgId) {
      setIsLoadingConfig(true)
      getGovernanceConfig(orgId).then((config) => {
        setGovernanceConfig(config)
        
        // If chairman term start date exists, set it as default start date
        if (config?.chairman_term_start_date) {
          setStartDate(config.chairman_term_start_date)
        }
      }).catch((error) => {
        console.error('Error loading governance config:', error)
      }).finally(() => {
        setIsLoadingConfig(false)
      })
    }
  }, [open, orgId])

  // Calculate end date based on term duration when position or start date changes
  useEffect(() => {
    if (selectedPosition === 'Pirmininkas' && startDate && governanceConfig?.chairman_term_duration_years) {
      const start = new Date(startDate)
      const durationYears = Number(governanceConfig.chairman_term_duration_years)
      if (!isNaN(durationYears) && durationYears > 0) {
        const end = new Date(start)
        end.setFullYear(end.getFullYear() + durationYears)
        // Set to last day of the year (or adjust as needed)
        end.setMonth(11, 31)
        setEndDate(end.toISOString().split('T')[0])
      }
    } else if (selectedPosition === 'Tarybos narys' && governanceConfig?.council_elected_with_chairman) {
      // If council members are elected with chairman, use same dates as chairman
      // This will be handled when assigning - we'll need to find chairman's term
      // For now, just clear end date if it was auto-set
      if (startDate && governanceConfig?.chairman_term_start_date === startDate) {
        // Use same calculation as chairman
        if (governanceConfig?.chairman_term_duration_years) {
          const start = new Date(startDate)
          const durationYears = Number(governanceConfig.chairman_term_duration_years)
          if (!isNaN(durationYears) && durationYears > 0) {
            const end = new Date(start)
            end.setFullYear(end.getFullYear() + durationYears)
            end.setMonth(11, 31)
            setEndDate(end.toISOString().split('T')[0])
          }
        }
      }
    }
  }, [selectedPosition, startDate, governanceConfig])

  const handleSubmit = async () => {
    // Validation
    if (!selectedPosition) {
      toast({
        title: "Klaida",
        description: "Prašome pasirinkti pareigas",
        variant: "destructive" as any,
      })
      return
    }

    if (!startDate) {
      toast({
        title: "Klaida",
        description: "Prašome pasirinkti pradžios datą",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await assignPosition(
        orgId,
        userId,
        selectedPosition,
        startDate,
        endDate || null
      )

      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Pareigos sėkmingai priskirtos",
        })
        onOpenChange(false)
        // Reset form
        setSelectedPosition('')
        setStartDate('')
        setEndDate('')
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko priskirti pareigų",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko priskirti pareigų",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form
    setSelectedPosition('')
    setStartDate('')
    setEndDate('')
  }

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Priskirti pareigas</DialogTitle>
          <DialogDescription>
            Priskiriate pareigas {userName || 'nariui'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingConfig && (
            <div className="flex items-center justify-center py-4">
              <LogoSpinner size={32} />
              <span className="ml-2 text-sm text-slate-500">Kraunama...</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="position">
              Pareigos <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedPosition}
              onValueChange={setSelectedPosition}
              disabled={isLoadingConfig}
            >
              <SelectTrigger
                id="position"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <SelectValue placeholder="Pasirinkite pareigas" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_TYPES.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">
              {selectedPosition === 'Pirmininkas' ? 'Kadencijos pradžia' : 'Pradžios data'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isLoadingConfig}
              required
            />
            {selectedPosition === 'Pirmininkas' && governanceConfig?.chairman_term_start_date && (
              <p className="text-xs text-muted-foreground">
                Pagal įstatus: {governanceConfig.chairman_term_start_date}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">
              {selectedPosition === 'Pirmininkas' ? 'Kadencijos pabaiga' : 'Pabaigos data'} <span className="text-muted-foreground text-xs">(nebūtina)</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isLoadingConfig}
            />
            {selectedPosition === 'Pirmininkas' && governanceConfig?.chairman_term_duration_years && endDate && (
              <p className="text-xs text-muted-foreground">
                Apskaičiuota pagal įstatus: {Number(governanceConfig.chairman_term_duration_years)} metų kadencija
              </p>
            )}
            {selectedPosition === 'Tarybos narys' && governanceConfig?.council_elected_with_chairman && (
              <p className="text-xs text-muted-foreground">
                Tarybos nariai renkami kartu su pirmininku - ta pati kadencija
              </p>
            )}
            {!selectedPosition && (
              <p className="text-xs text-muted-foreground">
                Palikite tuščią, jei pareigos neterminuotos
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Atšaukti
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPosition || !startDate || isLoadingConfig}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <LogoSpinner size={16} className="mr-2" />
                Priskiriama...
              </>
            ) : (
              'Patvirtinti'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

