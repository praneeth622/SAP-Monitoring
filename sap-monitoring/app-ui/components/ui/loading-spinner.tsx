import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
  className,
}: LoadingSpinnerProps) {
  // Size classes mapping
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <Loader2 
        className={cn("animate-spin text-primary", sizeClasses[size])}
        aria-label="loading"
      />
      {message && (
        <p className="text-muted-foreground text-sm font-medium text-center">
          {message}
        </p>
      )}
    </div>
  );
}