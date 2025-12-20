import { useEffect, useRef } from "react";
import { PipelineLog } from "@shared/schema";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LogConsoleProps {
  logs: PipelineLog[];
  className?: string;
}

export function LogConsole({ logs, className }: LogConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className={cn("rounded-lg border border-white/10 bg-black/60 font-mono text-sm p-8 text-center text-muted-foreground", className)}>
        <div className="animate-pulse">Waiting for system output...</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-white/10 bg-black/80 backdrop-blur-sm overflow-hidden flex flex-col shadow-2xl", className)}>
      <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">system.log</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground opacity-50">{logs.length} LINES</span>
      </div>
      
      <ScrollArea className="flex-1 p-4 h-[400px]">
        <div className="font-mono text-xs space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 group hover:bg-white/5 p-0.5 rounded px-2 transition-colors">
              <span className="text-muted-foreground opacity-50 select-none min-w-[130px]">
                {log.timestamp ? format(new Date(log.timestamp), "HH:mm:ss.SSS") : "--:--:--"}
              </span>
              <span className={cn(
                "font-bold min-w-[60px] uppercase",
                log.level === "error" ? "text-red-500" :
                log.level === "warn" ? "text-yellow-500" :
                "text-blue-400"
              )}>
                [{log.level}]
              </span>
              <span className={cn(
                "break-all whitespace-pre-wrap",
                log.level === "error" ? "text-red-300" : "text-gray-300"
              )}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
