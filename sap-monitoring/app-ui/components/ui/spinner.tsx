import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface SpinnerProps extends React.SVGAttributes<SVGElement> {
  size?: number
}

export function Spinner({ className, size = 16, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin", className)}
      size={size}
      {...props}
    />
  )
}