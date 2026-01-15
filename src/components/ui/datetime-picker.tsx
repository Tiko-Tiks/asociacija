'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/ui/time-picker'
import { DatePickerLT } from '@/components/ui/date-picker-lt'

interface DateTimePickerProps {
  value: string // ISO datetime string
  onChange: (value: string) => void
  required?: boolean
  id?: string
  className?: string
  minDate?: string // yyyy-MM-dd format
}

/**
 * DateTime Picker with separate date and time inputs
 * Uses 24-hour format (no AM/PM) and Lithuanian date format
 */
export function DateTimePicker({
  value,
  onChange,
  required,
  id,
  className,
  minDate,
}: DateTimePickerProps) {
  // Parse ISO datetime to date and time
  const [dateValue, setDateValue] = useState(() => {
    if (value) {
      const date = new Date(value)
      // Get local date components (YYYY-MM-DD)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return ''
  })

  const [timeValue, setTimeValue] = useState(() => {
    if (value) {
      const date = new Date(value)
      // Format as HH:mm (24-hour)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    return '09:00'
  })

  // Update parent when date or time changes
  useEffect(() => {
    if (dateValue && timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      // Parse dateValue as local date (not UTC) by appending time
      // Format: "2026-01-10T17:00:00" (without Z) is parsed as local time
      const localDateTimeString = `${dateValue}T${timeValue.padStart(5, '0')}:00`
      const date = new Date(localDateTimeString)
      
      // Convert to ISO string for backend (UTC)
      const isoString = date.toISOString()
      onChange(isoString)
    }
  }, [dateValue, timeValue, onChange])

  // Update local state when external value changes
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      // Get local date components (YYYY-MM-DD)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      setDateValue(`${year}-${month}-${day}`)
      setTimeValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`)
    }
  }, [value])

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        {/* Date Picker (Lithuanian format) */}
        <div className="space-y-2">
          <Label htmlFor={`${id}_date`}>Data</Label>
          <DatePickerLT
            id={`${id}_date`}
            value={dateValue}
            onChange={setDateValue}
            min={minDate}
            required={required}
            placeholder="Pasirinkite datą"
          />
        </div>

        {/* Time Picker (24-hour format) */}
        <div className="space-y-2">
          <Label htmlFor={`${id}_time`}>Laikas</Label>
          <TimePicker
            id={`${id}_time`}
            value={timeValue}
            onChange={setTimeValue}
            required={required}
          />
        </div>
      </div>
    </div>
  )
}
