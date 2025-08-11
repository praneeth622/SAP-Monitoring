"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import dayjs from "dayjs"

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
  showTime?: boolean
  align?: "start" | "center" | "end"
}

const presets = [
  {
    label: 'Today',
    value: 'today',
    getDate: () => ({
      from: new Date(),
      to: new Date()
    })
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    getDate: () => ({
      from: addDays(new Date(), -1),
      to: addDays(new Date(), -1)
    })
  },
  {
    label: 'Last 7 days',
    value: 'last7days',
    getDate: () => ({
      from: addDays(new Date(), -7),
      to: new Date()
    })
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getDate: () => ({
      from: addDays(new Date(), -30),
      to: new Date()
    })
  }
]

export function DateRangePicker({
  date,
  onDateChange,
  className,
  showTime = false,
  align = "end"
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
  const [tempTime, setTempTime] = React.useState({
    from: date?.from ? dayjs(date.from).format('HH:mm') : '00:00',
    to: date?.to ? dayjs(date.to).format('HH:mm') : '23:59'
  })

  React.useEffect(() => {
    if (date) {
      setTempDate(date)
      setTempTime({
        from: date.from ? dayjs(date.from).format('HH:mm') : '00:00',
        to: date.to ? dayjs(date.to).format('HH:mm') : '23:59'
      })
    }
  }, [date])

  const handleApply = React.useCallback(() => {
    if (tempDate?.from && tempDate?.to) {
      const [fromHours, fromMinutes] = tempTime.from.split(':')
      const [toHours, toMinutes] = tempTime.to.split(':')

      const newFrom = new Date(tempDate.from)
      newFrom.setHours(parseInt(fromHours), parseInt(fromMinutes))

      const newTo = new Date(tempDate.to)
      newTo.setHours(parseInt(toHours), parseInt(toMinutes))

      onDateChange({ from: newFrom, to: newTo })
    } else {
      onDateChange(undefined)
    }
    setIsOpen(false)
  }, [tempDate, tempTime, onDateChange])

  const handlePresetChange = React.useCallback((value: string) => {
    const preset = presets.find(p => p.value === value)
    if (preset) {
      const newDate = preset.getDate()
      setTempDate(newDate)
      setTempTime({
        from: '00:00',
        to: '23:59'
      })
      onDateChange(newDate)
      setIsOpen(false)
    }
  }, [onDateChange])

  const displayText = React.useMemo(() => {
    if (!date?.from) return "Select dates"
    
    const fromText = dayjs(date.from).format("MMM DD")
    const toText = date.to ? dayjs(date.to).format("MMM DD") : ""
    
    if (showTime) {
      const fromTime = dayjs(date.from).format("HH:mm")
      const toTime = date.to ? dayjs(date.to).format("HH:mm") : ""
      return `${fromText} ${fromTime} - ${toText} ${toTime}`
    }
    
    return date.to ? `${fromText} - ${toText}` : fromText
  }, [date, showTime])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2"
          align={align}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDate?.from}
                selected={tempDate}
                onSelect={setTempDate}
                numberOfMonths={1}
                disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
              />
              <div className="space-y-2 min-w-[120px]">
                <Select onValueChange={handlePresetChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Quick select" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value} className="text-xs">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {showTime && tempDate?.from && tempDate?.to && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs">Start</label>
                      <input
                        type="time"
                        className="w-full h-8 rounded-md border px-2 text-xs"
                        value={tempTime.from}
                        onChange={(e) => setTempTime(prev => ({ ...prev, from: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs">End</label>
                      <input
                        type="time"
                        className="w-full h-8 rounded-md border px-2 text-xs"
                        value={tempTime.to}
                        onChange={(e) => setTempTime(prev => ({ ...prev, to: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1 pt-2">
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setTempDate(undefined)
                      setTempTime({ from: '00:00', to: '23:59' })
                      onDateChange(undefined)
                      setIsOpen(false)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}