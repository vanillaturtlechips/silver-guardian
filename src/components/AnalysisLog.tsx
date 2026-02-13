import { useEffect, useRef } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/hooks/use-monitoring";

interface AnalysisLogProps {
  logs: LogEntry[];
  isScanning: boolean;
}

const typeColors: Record<LogEntry["type"], string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AnalysisLog({ logs, isScanning }: AnalysisLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="flex w-80 flex-col border-l bg-log">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/20 px-4 py-3">
        <Terminal className="h-4 w-4 text-log-foreground" />
        <span className="text-sm font-semibold text-log-foreground">AI Analysis Log</span>
        {isScanning && <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="py-8 text-center text-log-foreground/40">
            Awaiting video input…
          </p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="mb-1.5 leading-relaxed">
              <span className="text-log-foreground/50">[{formatTime(entry.timestamp)}]</span>{" "}
              <span className={cn(typeColors[entry.type])}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
