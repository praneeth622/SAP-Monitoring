import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  variant?: "default" | "green" | "yellow";
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  loading = false,
  variant = "default",
}: StatsCardProps) {
  return (
    <Card className={cn("p-6", loading && "animate-pulse")}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "p-3 rounded-xl",
            variant === "default" &&
              "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            variant === "green" &&
              "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
            variant === "yellow" &&
              "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{loading ? "-" : value}</p>
        </div>
      </div>
    </Card>
  );
}
