import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sensitivityLabels = ["Low", "Medium", "High"];

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8080");
  const [sensitivity, setSensitivity] = useState([1]); // 0=Low, 1=Med, 2=High
  const [scanInterval, setScanInterval] = useState([30]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Configure AI engine and detection parameters.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* API Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">API Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backend-url">Go Backend URL</Label>
              <Input
                id="backend-url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8080"
              />
            </div>
          </div>

          <Separator />

          {/* Detection Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Detection Settings</h3>
            <div className="space-y-2">
              <Label>Sensitivity: {sensitivityLabels[sensitivity[0]]}</Label>
              <Slider
                value={sensitivity}
                onValueChange={setSensitivity}
                min={0}
                max={2}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Scan Interval: {scanInterval[0]}s</Label>
              <Slider
                value={scanInterval}
                onValueChange={setScanInterval}
                min={5}
                max={120}
                step={5}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
