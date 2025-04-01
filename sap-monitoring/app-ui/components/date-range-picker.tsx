"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import dayjs from "dayjs";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
  showTime?: boolean;
  align?: "start" | "center" | "end";
}

const presets = [
  {
    label: "Today",
    value: "today",
    getDate: () => ({
      from: new Date(new Date().setHours(0, 0, 0, 0)),
      to: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getDate: () => {
      const yesterday = addDays(new Date(), -1);
      return {
        from: new Date(yesterday.setHours(0, 0, 0, 0)),
        to: new Date(yesterday.setHours(23, 59, 59, 999)),
      };
    },
  },
  {
    label: "Last 7 days",
    value: "last7days",
    getDate: () => ({
      from: new Date(addDays(new Date(), -7).setHours(0, 0, 0, 0)),
      to: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
  },
  {
    label: "Last 30 days",
    value: "last30days",
    getDate: () => ({
      from: new Date(addDays(new Date(), -30).setHours(0, 0, 0, 0)),
      to: new Date(new Date().setHours(23, 59, 59, 999)),
    }),
  },
];

export function DateRangePicker({
  date,
  onDateChange,
  className,
  showTime = false,
  align = "end",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);
  const [tempTime, setTempTime] = React.useState({
    from: date?.from ? dayjs(date.from).format("HH:mm") : "00:00",
    to: date?.to ? dayjs(date.to).format("HH:mm") : "23:59",
  });

  // Update internal state when external date prop changes
  React.useEffect(() => {
    if (date) {
      setTempDate({
        from: date.from ? new Date(date.from) : undefined,
        to: date.to ? new Date(date.to) : undefined,
      });
      setTempTime({
        from: date.from ? dayjs(date.from).format("HH:mm") : "00:00",
        to: date.to ? dayjs(date.to).format("HH:mm") : "23:59",
      });
    } else {
      setTempDate(undefined);
      setTempTime({ from: "00:00", to: "23:59" });
    }
  }, [date]);

  // Handle applying the selected date range
  const handleApply = React.useCallback(() => {
    if (tempDate?.from && tempDate?.to) {
      try {
        const [fromHours, fromMinutes] = tempTime.from.split(":").map(Number);
        const [toHours, toMinutes] = tempTime.to.split(":").map(Number);

        // Create new Date objects to avoid modifying original references
        const newFrom = new Date(tempDate.from);
        newFrom.setHours(fromHours, fromMinutes, 0, 0);

        const newTo = new Date(tempDate.to);
        newTo.setHours(toHours, toMinutes, 59, 999);

        // Pass properly formatted dates to the parent component
        onDateChange({
          from: newFrom,
          to: newTo,
        });
      } catch (error) {
        console.error("Error applying date range:", error);
        // Fall back to using the date without time if there's an error
        onDateChange(tempDate);
      }
    } else {
      onDateChange(tempDate);
    }
    setIsOpen(false);
  }, [tempDate, tempTime, onDateChange]);

  // Handle preset date selection
  const handlePresetChange = React.useCallback(
    (value: string) => {
      const preset = presets.find((p) => p.value === value);
      if (preset) {
        const newDate = preset.getDate();
        setTempDate(newDate);
        setTempTime({
          from: "00:00",
          to: "23:59",
        });

        // Important: directly apply the preset dates with proper times
        onDateChange({
          from: newDate.from,
          to: newDate.to,
        });
        setIsOpen(false);
      }
    },
    [onDateChange]
  );

  // Handle calendar date selection
  const handleCalendarSelect = React.useCallback(
    (newDate: DateRange | undefined) => {
      if (newDate?.from) {
        // Ensure from date has time set to beginning of day
        const from = new Date(newDate.from);
        from.setHours(0, 0, 0, 0);

        // If to date exists, set its time to end of day
        const to = newDate.to ? new Date(newDate.to) : undefined;
        if (to) {
          to.setHours(23, 59, 59, 999);
        }

        setTempDate({ from, to });
      } else {
        setTempDate(newDate);
      }
    },
    []
  );

  // Format the display text based on selected date range
  const displayText = React.useMemo(() => {
    if (!date?.from) return "Select dates";

    const fromText = dayjs(date.from).format("MMM DD, YYYY");
    const toText = date.to ? dayjs(date.to).format("MMM DD, YYYY") : "";

    if (showTime && date?.from) {
      const fromTime = dayjs(date.from).format("HH:mm");
      const toTime = date.to ? dayjs(date.to).format("HH:mm") : "";

      if (date.to && dayjs(date.from).isSame(date.to, "day")) {
        // Same day, show date once
        return `${fromText} (${fromTime} - ${toTime})`;
      }

      return date.to
        ? `${fromText} ${fromTime} - ${toText} ${toTime}`
        : fromText;
    }

    return date.to ? `${fromText} - ${toText}` : fromText;
  }, [date, showTime]);

  // Reset functionality
  const handleReset = React.useCallback(() => {
    setTempDate(undefined);
    setTempTime({ from: "00:00", to: "23:59" });
    onDateChange(undefined);
    setIsOpen(false);
  }, [onDateChange]);

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
        <PopoverContent className="w-auto p-2" align={align}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDate?.from || new Date()}
                selected={tempDate}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
                disabled={(date) =>
                  date > new Date() || date < new Date("2000-01-01")
                }
              />
              <div className="space-y-2 min-w-[120px]">
                <Select onValueChange={handlePresetChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Quick select" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem
                        key={preset.value}
                        value={preset.value}
                        className="text-xs"
                      >
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
                        onChange={(e) =>
                          setTempTime((prev) => ({
                            ...prev,
                            from: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs">End</label>
                      <input
                        type="time"
                        className="w-full h-8 rounded-md border px-2 text-xs"
                        value={tempTime.to}
                        onChange={(e) =>
                          setTempTime((prev) => ({
                            ...prev,
                            to: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1 pt-2">
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={handleApply}
                    disabled={!tempDate?.from || !tempDate?.to}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleReset}
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
  );
}
