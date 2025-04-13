"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (option: string) => {
    onChange(value.filter((item) => item !== option));
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${
            value.length > 0 ? "h-auto min-h-10" : "h-10"
          }`}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {value.length === 0 && placeholder}
            {value.map((item) => (
              <Badge
                variant="secondary"
                key={item}
                className="mr-1 mb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnselect(item);
                }}
              >
                {item}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(item);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {item}</span>
                </button>
              </Badge>
            ))}
          </div>
          <div className="opacity-50 ml-2">▼</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
          />
          <CommandEmpty>No options found</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(
                      isSelected
                        ? value.filter((item) => item !== option.value)
                        : [...value, option.value]
                    );
                  }}
                >
                  <div
                    className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
