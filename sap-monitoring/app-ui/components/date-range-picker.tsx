"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays } from "date-fns"
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
    }
  }, [])

  const displayText = React.useMemo(() => {
    if (!date?.from) return "Pick a date range"
    
    const fromText = dayjs(date.from).format("MMM DD, YYYY")
    const toText = date.to ? dayjs(date.to).format("MMM DD, YYYY") : ""
    
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
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={align}
        >
          <div className="space-y-4 p-4">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a preset range" />
              </SelectTrigger>
              <SelectContent position="popper">
                {presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="border rounded-md p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDate?.from}
                selected={tempDate}
                onSelect={setTempDate}
                numberOfMonths={1}
                disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
              />
            </div>

            {showTime && tempDate?.from && tempDate?.to && (
              <div className="grid gap-4">
                <div className="flex gap-2">
                  <div className="grid gap-1.5 flex-1">
                    <label className="text-sm font-medium">Start Time</label>
                    <input
                      type="time"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={tempTime.from}
                      onChange={(e) => setTempTime(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5 flex-1">
                    <label className="text-sm font-medium">End Time</label>
                    <input
                      type="time"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={tempTime.to}
                      onChange={(e) => setTempTime(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempDate(undefined)
                  setTempTime({ from: '00:00', to: '23:59' })
                  onDateChange(undefined)
                  setIsOpen(false)
                }}
              >
                Reset
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}