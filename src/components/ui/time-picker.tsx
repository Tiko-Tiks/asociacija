'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerProps {
  value: string // HH:mm format
  onChange: (value: string) => void
  min?: string // HH:mm format
  required?: boolean
  className?: string
  id?: string
  minuteStep?: number // Default 5
}

export function TimePicker({
  value,
  onChange,
  required,
  className,
  id,
  minuteStep = 5,
}: TimePickerProps) {
  // Parse initial value
  const parseTime = useCallback((timeStr: string) => {
    if (timeStr) {
      const [h, m] = timeStr.split(':')
      return {
        hours: parseInt(h) || 9,
        minutes: parseInt(m) || 0
      }
    }
    return { hours: 9, minutes: 0 }
  }, [])

  const [selectedHour, setSelectedHour] = useState(() => parseTime(value).hours)
  const [selectedMinute, setSelectedMinute] = useState(() => parseTime(value).minutes)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInteractingRef = useRef(false)

  // Generate minute options based on step
  const minuteOptions = useMemo(() => {
    const options: number[] = []
    for (let i = 0; i < 60; i += minuteStep) {
      options.push(i)
    }
    return options
  }, [minuteStep])

  // Common time presets
  const presets = useMemo(() => [
    { label: '09:00', hour: 9, minute: 0 },
    { label: '10:00', hour: 10, minute: 0 },
    { label: '14:00', hour: 14, minute: 0 },
    { label: '16:00', hour: 16, minute: 0 },
    { label: '18:00', hour: 18, minute: 0 },
    { label: '19:00', hour: 19, minute: 0 },
  ], [])

  // Sync with external value only when popup is closed
  useEffect(() => {
    if (!isOpen && value) {
      const parsed = parseTime(value)
      setSelectedHour(parsed.hours)
      setSelectedMinute(parsed.minutes)
    }
  }, [value, isOpen, parseTime])

  // Close on outside click with delay to allow interactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if interacting
      if (isInteractingRef.current) return
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Small delay to allow button clicks to register
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

  const formatTime = useCallback((h: number, m: number): string => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }, [])

  const handlePresetClick = (hour: number, minute: number) => {
    const formattedTime = formatTime(hour, minute)
    onChange(formattedTime)
    setSelectedHour(hour)
    setSelectedMinute(minute)
    setIsOpen(false)
  }

  const handleConfirm = () => {
    const formattedTime = formatTime(selectedHour, selectedMinute)
    onChange(formattedTime)
    setIsOpen(false)
  }

  const incrementHour = () => {
    isInteractingRef.current = true
    const newHour = selectedHour >= 23 ? 0 : selectedHour + 1
    setSelectedHour(newHour)
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const decrementHour = () => {
    isInteractingRef.current = true
    const newHour = selectedHour <= 0 ? 23 : selectedHour - 1
    setSelectedHour(newHour)
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const incrementMinute = () => {
    isInteractingRef.current = true
    const currentIndex = minuteOptions.indexOf(selectedMinute)
    const nextIndex = currentIndex >= minuteOptions.length - 1 ? 0 : currentIndex + 1
    setSelectedMinute(minuteOptions[nextIndex])
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  const decrementMinute = () => {
    isInteractingRef.current = true
    const currentIndex = minuteOptions.indexOf(selectedMinute)
    const prevIndex = currentIndex <= 0 ? minuteOptions.length - 1 : currentIndex - 1
    setSelectedMinute(minuteOptions[prevIndex])
    setTimeout(() => { isInteractingRef.current = false }, 200)
  }

  // Display value from props (what's actually saved)
  const displayValue = value || '09:00'
  // Preview value from current selection
  const previewValue = formatTime(selectedHour, selectedMinute)

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={cn(
          "flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="font-medium">{displayValue}</span>
        <input
          id={id}
          type="hidden"
          value={displayValue}
          required={required}
        />
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72"
          onMouseDown={() => { isInteractingRef.current = true }}
          onMouseUp={() => { setTimeout(() => { isInteractingRef.current = false }, 200) }}
        >
          {/* Quick presets */}
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">Dažnai naudojami laikai:</div>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs",
                    displayValue === preset.label && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handlePresetClick(preset.hour, preset.minute)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-3">Arba pasirinkite tikslų laiką:</div>
            
            {/* Spinner-style time selection */}
            <div className="flex items-center justify-center gap-4">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={incrementHour}
                  className="h-8 w-12 p-0"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div className="text-3xl font-bold text-slate-900 my-1 w-12 text-center tabular-nums">
                  {selectedHour.toString().padStart(2, '0')}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={decrementHour}
                  className="h-8 w-12 p-0"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
                <div className="text-xs text-muted-foreground mt-1">val.</div>
              </div>

              <div className="text-3xl font-bold text-muted-foreground mb-6">:</div>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={incrementMinute}
                  className="h-8 w-12 p-0"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div className="text-3xl font-bold text-slate-900 my-1 w-12 text-center tabular-nums">
                  {selectedMinute.toString().padStart(2, '0')}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={decrementMinute}
                  className="h-8 w-12 p-0"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
                <div className="text-xs text-muted-foreground mt-1">min.</div>
              </div>
            </div>
          </div>

          {/* Current selection and confirm */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Dabartinis: <span className="font-medium">{displayValue}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
            >
              Pasirinkti {previewValue}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
