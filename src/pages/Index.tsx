import { useState } from "react";
import { StatusBar } from "@/components/StatusBar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AnalysisLog } from "@/components/AnalysisLog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useMonitoring } from "@/hooks/use-monitoring";

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isScanning, safetyScore, engineStatus, logs, videoId, startMonitoring } =
    useMonitoring();

  return (
    <div className="flex h-screen flex-col bg-background">
      <StatusBar
        engineStatus={engineStatus}
        safetyScore={safetyScore}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Center: Video Player */}
        <div className="flex flex-1 flex-col p-4">
          <VideoPlayer
            videoId={videoId}
            isScanning={isScanning}
            onSubmitUrl={startMonitoring}
          />
        </div>

        {/* Right: Analysis Log */}
        <AnalysisLog logs={logs} isScanning={isScanning} />
      </div>

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
