import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/StatusBar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AnalysisLog } from "@/components/AnalysisLog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useMonitoringContext } from "@/context/MonitoringContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText } from "lucide-react";

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const { isScanning, safetyScore, engineStatus, logs, videoId, startMonitoring, analysisResult } =
    useMonitoringContext();

  // 분석 완료 시 모달 표시 (10초 후 자동 닫힘)
  useEffect(() => {
    if (analysisResult && !isScanning && engineStatus === "active") {
      setShowModal(true);
      const timer = setTimeout(() => {
        setShowModal(false);
      }, 10000); 

      return () => clearTimeout(timer);
    }
  }, [analysisResult, isScanning, engineStatus]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <StatusBar
        engineStatus={engineStatus}
        safetyScore={safetyScore}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 중앙 패널: 비디오 플레이어 */}
        <div className="flex flex-1 flex-col p-4 gap-4 relative">
          <VideoPlayer
            videoId={videoId}
            isScanning={isScanning}
            onSubmitUrl={startMonitoring}
          />

          {/* ★ 상세 페이지 이동 버튼 (분석 결과가 있을 때만 표시) */}
          {analysisResult && !isScanning && (
            <div className="absolute bottom-6 right-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <Button 
                size="lg" 
                className="shadow-xl gap-2 text-lg h-14 px-8 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all hover:scale-105"
                onClick={() => navigate("/result")}
              >
                <FileText className="w-5 h-5" />
                상세 결과 보기
                <ChevronRight className="w-5 h-5 opacity-70" />
              </Button>
            </div>
          )}
        </div>

        {/* 우측 패널: 로그 */}
        <AnalysisLog logs={logs} isScanning={isScanning} />
      </div>

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* 결과 알림 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>분석 완료</DialogTitle>
            <DialogDescription className="pt-2 text-base font-medium text-foreground leading-relaxed">
              {analysisResult?.summary || "영상의 안전성 분석이 완료되었습니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className={`text-sm font-semibold ${
                safetyScore >= 80 ? "text-green-600" : 
                safetyScore >= 50 ? "text-yellow-600" : "text-red-600"
            }`}>
              안전 점수: {safetyScore}점
            </div>
          </div>
          <DialogFooter className="sm:justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground text-center sm:text-left">
              10초 후 자동으로 닫힙니다.
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1 sm:flex-none">
                닫기
              </Button>
              <Button onClick={() => navigate("/result")} className="flex-1 sm:flex-none">
                자세히 보기
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;