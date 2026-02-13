import { Shield, Activity, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  engineStatus: "idle" | "active" | "scanning" | "error";
  safetyScore: number;
  onOpenSettings: () => void;
}

const statusConfig = {
  idle: { label: "Idle", dotClass: "bg-muted-foreground" },
  active: { label: "Active", dotClass: "bg-success animate-pulse" },
  scanning: { label: "Scanning…", dotClass: "bg-warning animate-pulse" },
  error: { label: "Error", dotClass: "bg-destructive animate-pulse" },
};

export function StatusBar({ engineStatus, safetyScore, onOpenSettings }: StatusBarProps) {
  const status = statusConfig[engineStatus];

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Silver Guardian
        </h1>
      </div>

      <div className="flex items-center gap-8">
        {/* Engine Status */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Engine Status:</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full", status.dotClass)} />
            {status.label}
          </span>
        </div>

        {/* Safety Score */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Safety Score:</span>
          <div className="flex items-center gap-2">
            <Progress value={safetyScore} className="h-2.5 w-32" />
            <span className="min-w-[3ch] text-sm font-bold text-foreground">{safetyScore}%</span>
          </div>
        </div>

        {/* Settings */}
        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
