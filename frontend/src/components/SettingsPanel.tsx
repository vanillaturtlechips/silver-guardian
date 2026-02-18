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

// [핵심] .env 없이 주소를 결정하는 함수
const getDefaultBackendUrl = () => {
  // 1. 서버 사이드 렌더링 방지 (안전 장치)
  if (typeof window === 'undefined') return "https://api.silver-guardian.site";

  const hostname = window.location.hostname;

  // 2. 로컬 개발 환경인 경우 (localhost)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8080";
  }

  // 3. 배포 환경인 경우 (팀원들이 들어올 때)
  // 도메인이 무엇이든 로컬이 아니면 무조건 운영 API 주소를 반환
  return "https://api.silver-guardian.site";
};

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState("");
  
  // [수정] 위에서 만든 함수를 사용하여 초기값 설정
  // 이제 import.meta.env.VITE_GRPC_URL 자체가 필요 없습니다.
  const [backendUrl, setBackendUrl] = useState(getDefaultBackendUrl());

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
                // placeholder도 동적으로 보여주면 더 좋습니다
                placeholder={getDefaultBackendUrl()}
              />
              <p className="text-xs text-muted-foreground">
                Current API: {backendUrl}
              </p>
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