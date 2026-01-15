'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LITHUANIAN_MONTHS = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
]

const LITHUANIAN_WEEKDAYS = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk']

interface DatePickerLTProps {
  value: string // yyyy-MM-dd format
  onChange: (value: string) => void
  min?: string // yyyy-MM-dd format
  max?: string // yyyy-MM-dd format
  required?: boolean
  className?: string
  id?: string
  placeholder?: string
}

// Helper to compare dates (ignoring time)
function compareDates(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  return d1.getTime() - d2.getTime()
}

// Format date in Lithuanian
function formatDateLT(year: number, month: number, day: number): string {
  return `${year} m. ${LITHUANIAN_MONTHS[month].toLowerCase()} ${day} d.`
}

export function DatePickerLT({
  value,
  onChange,
  min,
  max,
  required,
  className,
  id,
  placeholder = 'Pasirinkite datą',
}: DatePickerLTProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInteractingRef = useRef(false)
  
  // Parse current value or use min date or today
  const today = useMemo(() => new Date(), [])
  
  // Parse min/max dates
  const minDate = useMemo(() => {
    if (!min) return null
    const [y, m, d] = min.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [min])
  
  const maxDate = useMemo(() => {
    if (!max) return null
    const [y, m, d] = max.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [max])
  
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      return parseInt(value.split('-')[0])
    }
    if (minDate) {
      return minDate.getFullYear()
    }
    return today.getFullYear()
  })
  
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      return parseInt(value.split('-')[1]) - 1
    }
    if (minDate) {
      return minDate.getMonth()
    }
    return today.getMonth()
  })

  // Get days in month
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate()
  }, [viewYear, viewMonth])

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = useMemo(() => {
    const day = new Date(viewYear, viewMonth, 1).getDay()
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1
  }, [viewYear, viewMonth])

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }
    return days
  }, [daysInMonth, firstDayOfMonth])

  // Update view when value changes (only when closed)
  useEffect(() => {
    if (value && !isOpen) {
      const [y, m] = value.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
    }
  }, [value, isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isInteractingRef.current) return
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setTimeout(() => {
          if (!isInteractingRef.current) {
            setIsOpen(false)
          }
        }, 100)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const isDateDisabled = useCallback((day: number): boolean => {
    const date = new Date(viewYear, viewMonth, day)
    if (minDate && compareDates(date, minDate) < 0) return true
    if (maxDate && compareDates(date, maxDate) > 0) return true
    return false
  }, [viewYear, viewMonth, minDate, maxDate])

  const handleDayClick = (day: number) => {
    if (isDateDisabled(day)) return
    
    const formattedDate = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    onChange(formattedDate)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    isInteractingRef.current = true
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const handleNextMonth = () => {
    isInteractingRef.current = true
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const handlePrevYear = () => {
    isInteractingRef.current = true
    setViewYear(viewYear - 1)
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const handleNextYear = () => {
    isInteractingRef.current = true
    setViewYear(viewYear + 1)
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  // Format display value in Lithuanian
  const displayValue = useMemo(() => {
    if (!value) return ''
    const [y, m, d] = value.split('-').map(Number)
    return formatDateLT(y, m - 1, d)
  }, [value])

  // Format min date for display
  const minDateDisplay = useMemo(() => {
    if (!minDate) return null
    return formatDateLT(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
  }, [minDate])

  // Check if selected
  const isSelected = useCallback((day: number): boolean => {
    if (!value) return false
    const [y, m, d] = value.split('-').map(Number)
    return y === viewYear && m === viewMonth + 1 && d === day
  }, [value, viewYear, viewMonth])

  // Check if today
  const isToday = useCallback((day: number): boolean => {
    return viewYear === today.getFullYear() && 
           viewMonth === today.getMonth() && 
           day === today.getDate()
  }, [viewYear, viewMonth, today])

  // Check if "today" button should be disabled
  const isTodayDisabled = useMemo(() => {
    if (minDate && compareDates(today, minDate) < 0) return true
    if (maxDate && compareDates(today, maxDate) > 0) return true
    return false
  }, [today, minDate, maxDate])

  // Jump to min date
  const handleMinDateClick = () => {
    if (!minDate) return
    const formattedDate = `${minDate.getFullYear()}-${(minDate.getMonth() + 1).toString().padStart(2, '0')}-${minDate.getDate().toString().padStart(2, '0')}`
    onChange(formattedDate)
    setViewYear(minDate.getFullYear())
    setViewMonth(minDate.getMonth())
    setIsOpen(false)
  }

  const handleTodayClick = () => {
    if (isTodayDisabled) return
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
    onChange(todayStr)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={cn(
          "flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors",
          !value && "text-muted-foreground",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className={cn("flex-1", value && "font-medium")}>
          {displayValue || placeholder}
        </span>
        <input
          id={id}
          type="hidden"
          value={value || ''}
          required={required}
        />
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
          onMouseDown={() => { isInteractingRef.current = true }}
          onMouseUp={() => { setTimeout(() => { isInteractingRef.current = false }, 200) }}
        >
          {/* Min date notice */}
          {minDate && isTodayDisabled && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <strong>Minimali data:</strong> {minDateDisplay}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2 text-xs text-amber-800 underline"
                onClick={handleMinDateClick}
              >
                Pasirinkti
              </Button>
            </div>
          )}
          
          {/* Year navigation */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevYear}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{viewYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextYear}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-semibold">
              {LITHUANIAN_MONTHS[viewMonth]}
            </span>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {LITHUANIAN_WEEKDAYS.map((day) => (
              <div 
                key={day} 
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div key={index} className="aspect-square">
                {day !== null ? (
                  <button
                    type="button"
                    disabled={isDateDisabled(day)}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "w-full h-full rounded-md text-sm font-medium transition-colors",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                      isSelected(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                      isToday(day) && !isSelected(day) && "border-2 border-primary",
                      isDateDisabled(day) && "opacity-30 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {day}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>

          {/* Footer buttons */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                disabled={isTodayDisabled}
              >
                Šiandien
              </Button>
              {minDate && isTodayDisabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMinDateClick}
                >
                  Ankstiausia
                </Button>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Uždaryti
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
