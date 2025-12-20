import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Status = "pending" | "running" | "completed" | "failed" | string;

interface StatusBadgeProps {
  status: Status;
  className?: string;
  animate?: boolean;
}

export function StatusBadge({ status, className, animate = true }: StatusBadgeProps) {
  const config = {
    pending: {
      color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
      icon: Clock,
      label: "PENDING",
      shadow: "shadow-yellow-400/10",
    },
    running: {
      color: "text-primary bg-primary/10 border-primary/20",
      icon: Loader2,
      label: "RUNNING",
      shadow: "shadow-primary/10",
    },
    completed: {
      color: "text-green-400 bg-green-400/10 border-green-400/20",
      icon: CheckCircle2,
      label: "COMPLETED",
      shadow: "shadow-green-400/10",
    },
    failed: {
      color: "text-destructive bg-destructive/10 border-destructive/20",
      icon: XCircle,
      label: "FAILED",
      shadow: "shadow-destructive/10",
    },
  };

  const current = config[status as keyof typeof config] || {
    color: "text-muted-foreground bg-muted/10 border-muted/20",
    icon: Clock,
    label: status.toUpperCase(),
    shadow: "",
  };

  const Icon = current.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm font-mono tracking-wide",
      current.color,
      current.shadow,
      className
    )}>
      <Icon className={cn("w-3.5 h-3.5", animate && status === "running" && "animate-spin")} />
      {current.label}
    </div>
  );
}
