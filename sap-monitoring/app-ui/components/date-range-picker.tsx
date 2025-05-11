"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import dayjs from "dayjs"

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
  showTime?: boolean
  align?: "start" | "center" | "end"
}

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

  const displayText = React.useMemo(() => {
    // Use tempDate/tempTime if popover is open, otherwise use date
    const current = isOpen ? tempDate : date;
    if (!current?.from) return "Select dates";
    const fromText = dayjs(current.from).format("MMM DD");
    const toText = current.to ? dayjs(current.to).format("MMM DD") : "";
    if (showTime) {
      // Use tempTime if popover is open, otherwise use the time from the date prop
      const fromTime = isOpen ? tempTime.from : dayjs(current.from).format("HH:mm");
      const toTime = isOpen && current.to ? tempTime.to : (current.to ? dayjs(current.to).format("HH:mm") : "");
      return `${fromText} ${fromTime} - ${toText} ${toTime}`;
    }
    return current.to ? `${fromText} - ${toText}` : fromText;
  }, [date, tempDate, tempTime, isOpen, showTime]);

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
                onSelect={(range) => {
                  setTempDate(range);
                  if (range?.from && range?.to && !showTime) {
                    onDateChange(range);
                    setIsOpen(false);
                  }
                }}
                numberOfMonths={1}
                disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
              />
              <div className="space-y-2 min-w-[120px]">
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