import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface PopoverWarningButtonProps {
  children: React.ReactNode;
  hint: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function PopoverWarningButton({
  children,
  hint,
  disabled = true,
  className,
  onClick,
}: PopoverWarningButtonProps) {
  return (
    <div className="relative group">
      <button
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "rounded-md px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {children}
      </button>
      {disabled && (
        <div
          className={cn(
            "absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200",
            "w-max max-w-xs bottom-full z-20  left-1/2 -translate-x-1/2 mt-2",
            "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
            "rounded-md shadow-lg py-2 px-3 text-sm",
            "after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-full",
            "after:border-8 after:border-transparent",
            "after:border-b-amber-50 dark:after:border-b-amber-900/30"
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{hint}</span>
          </div>
        </div>
      )}
    </div>
  );
}
