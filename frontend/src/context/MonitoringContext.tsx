// @ts-nocheck
import React, { createContext, useContext, useState, ReactNode } from "react";
import { api } from "@/lib/api"; 
import { useAuth } from "@/features/auth/AuthContext"; // [추가] 유저 정보를 가져오기 위함
import { useToast } from "@/hooks/use-toast";

export interface AnalysisResultType {
  summary: string;
  reasoning: string;
  concerns: string[];
  safety_score: number;
}

export interface StartAnalysisResponse {
  jobId: string;
}

interface MonitoringContextType {
  isAnalyzing: boolean;
  progress: number;
  statusMessage: string;
  analysisResult: AnalysisResultType | null;
  videoId: string | null;
  startAnalysis: (url: string) => Promise<StartAnalysisResponse | undefined>;
  resetAnalysis: () => void;
  setAnalysisProgress: (progress: number, message: string) => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

// [수정] Vite HMR 호환성을 위해 function 선언문 사용
export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  
  const { user } = useAuth(); // [핵심] 로그인된 유저 정보를 가져옴
  const { toast } = useToast();

  // 분석 시작 로직
  async function startAnalysis(url: string): Promise<StartAnalysisResponse | undefined> {
    setIsAnalyzing(true);
    setProgress(5); 
    setStatusMessage("분석 서버에 연결 요청 중...");

    try {
      // [핵심] 두 번째 인자로 user.id를 넘겨야 서버 DB에 유저 기록으로 저장됩니다.
      const response = await api.submitVideoForAnalysis({
        videoUrl: url,
        sensitivity: "medium",
        scanInterval: 30
      }, user?.id || ""); // 로그인 상태라면 ID를, 아니면 빈 값을 보냅니다.

      if (!response || !response.jobId) {
        throw new Error("Job ID를 수신하지 못했습니다.");
      }

      const jobId = response.jobId;
      console.log("[SYSTEM] 분석 세션 생성됨:", jobId);
      
      setStatusMessage("분석 세션 생성 완료. 엔진 가동 중...");
      setProgress(10);
      
      setIsAnalyzing(false); 
      return { jobId };

    } catch (error) {
      console.error("[ERROR] 분석 요청 실패:", error);
      toast({
        title: "분석 요청 실패",
        description: "서버가 응답하지 않거나 잘못된 URL입니다.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      setProgress(0);
      setStatusMessage("분석 실패");
      return undefined; 
    }
  }

  function setAnalysisProgress(newProgress: number, newMessage: string) {
    setProgress(newProgress);
    setStatusMessage(newMessage);
  }

  function resetAnalysis() {
    setAnalysisResult(null);
    setVideoId(null);
    setProgress(0);
    setStatusMessage("");
    setIsAnalyzing(false);
  }

  return (
    <MonitoringContext.Provider
      value={{ 
        isAnalyzing, 
        progress, 
        statusMessage,
        analysisResult, 
        videoId, 
        startAnalysis, 
        resetAnalysis,
        setAnalysisProgress 
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

// [수정] 훅도 function으로 내보내어 Fast Refresh 오류 해결
export function useMonitoringContext() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error("useMonitoringContext must be used within a MonitoringProvider");
  }
  return context;
}