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
        <Icon className={cn(
          "h-8 w-8",
          variant === "default" && "text-primary",
          variant === "green" && "text-green-500",
          variant === "yellow" && "text-yellow-500"
        )} />
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{loading ? "-" : value}</p>
        </div>
      </div>
    </Card>
  );
}