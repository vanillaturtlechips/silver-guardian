import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { grpcClient } from "@/lib/grpc-client";

// --- 타입 정의 ---
export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface AnalysisData {
  safety_score: number;
  summary: string;
  reasoning: string;
  concerns: string[];
}

export interface MonitoringState {
  isScanning: boolean;
  safetyScore: number;
  engineStatus: "idle" | "active" | "scanning" | "error";
  logs: LogEntry[];
  videoId: string | null;
  analysisResult: AnalysisData | null;
}

interface MonitoringContextType extends MonitoringState {
  startMonitoring: (videoUrl: string) => Promise<void>;
  stopMonitoring: () => void;
  addLog: (type: LogEntry["type"], message: string) => void;
  resetMonitoring: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MonitoringState>({
    isScanning: false,
    safetyScore: 0,
    engineStatus: "idle",
    logs: [],
    videoId: null,
    analysisResult: null,
  });

  // 스트림 객체를 저장할 Ref (취소 기능용)
  const streamRef = useRef<any>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        { id: crypto.randomUUID(), timestamp: new Date(), type, message },
      ],
    }));
  }, []);

  const startMonitoring = useCallback(
    async (videoUrl: string) => {
      // 1. 기존 스트림 안전하게 정리
      if (streamRef.current) {
        try {
            if (typeof streamRef.current.cancel === 'function') {
                streamRef.current.cancel();
            }
        } catch (e) {
            // 조용히 무시 (이미 닫힌 스트림일 수 있음)
        }
        streamRef.current = null;
      }

      // 2. 상태 초기화 (새로운 검사 준비)
      setState((prev) => ({
        ...prev,
        isScanning: true,
        engineStatus: "scanning",
        logs: [],
        safetyScore: 0,
        videoId: videoUrl,
        analysisResult: null,
      }));

      try {
        // 분석 요청 시작
        const response = await grpcClient.startAnalysis(videoUrl);
        const jobId = (response as any).jobId;

        // ★ 핵심: await를 사용하여 Promise가 아닌 실제 Stream 객체를 받음
        const stream = await grpcClient.streamProgress(
          jobId,
          (event: any) => {
            const logType = event.type === "error" ? "error" : 
                           event.type === "complete" ? "success" : "info";
            
            // 완료 메시지는 별도로 처리하므로 로그에 중복 출력 방지 (선택 사항)
            if (event.type !== "complete") {
               addLog(logType, event.message);
            } else {
               addLog(logType, "Analysis completed successfully");
            }

            if (event.type === "complete") {
              // ★ JSON 파싱 (에러 처리 강화)
              let parsedResult: AnalysisData | null = null;
              try {
                parsedResult = JSON.parse(event.message);
              } catch (e) {
                // JSON 파싱 실패 시, 에러를 콘솔에 띄우지 않고 평문 메시지로 처리 (Fallback)
                parsedResult = {
                    safety_score: event.progress,
                    summary: "분석이 완료되었습니다.",
                    reasoning: event.message, // 백엔드가 보낸 평문 메시지를 그대로 사용
                    concerns: []
                };
              }

              setState((prev) => ({
                ...prev,
                analysisResult: parsedResult,
                isScanning: false,
                engineStatus: "active",
                safetyScore: parsedResult?.safety_score || event.progress || prev.safetyScore,
              }));
            } else {
              // 진행 중 상태 업데이트
              setState((prev) => ({
                ...prev,
                safetyScore: event.progress || prev.safetyScore,
                isScanning: event.type !== "complete" && event.type !== "error",
                engineStatus: event.type === "error" ? "error" : "scanning",
              }));
            }
          },
          () => {
            // 스트림 정상 종료
            setState((prev) => ({
              ...prev,
              isScanning: false,
              engineStatus: "active",
            }));
          },
          (error: any) => {
            // ★ gRPC 연결 종료 관련 에러 무시 처리
            if (error.message && error.message.includes("Response closed without grpc-status")) {
                // 이는 gRPC-Web의 흔한 동작이므로 에러로 취급하지 않음
                return; 
            }

            console.error("Stream error:", error);
            addLog("error", `Connection error: ${error.message}`);
            setState((prev) => ({
              ...prev,
              isScanning: false,
              engineStatus: "error",
            }));
          }
        );

        // 실제 스트림 객체를 ref에 저장
        streamRef.current = stream;

      } catch (error: any) {
        console.error("Failed to start analysis:", error);
        addLog("error", `Failed to start: ${error.message}`);
        setState((prev) => ({
          ...prev,
          isScanning: false,
          engineStatus: "error",
        }));
      }
    },
    [addLog]
  );

  const stopMonitoring = useCallback(() => {
    if (streamRef.current && typeof streamRef.current.cancel === 'function') {
      streamRef.current.cancel();
      streamRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isScanning: false,
      engineStatus: "idle",
    }));
    addLog("info", "Monitoring session stopped");
  }, [addLog]);

  const resetMonitoring = useCallback(() => {
    if (streamRef.current && typeof streamRef.current.cancel === 'function') {
        streamRef.current.cancel();
    }
    setState({
        isScanning: false,
        safetyScore: 0,
        engineStatus: "idle",
        logs: [],
        videoId: null,
        analysisResult: null,
    });
  }, []);

  return (
    <MonitoringContext.Provider value={{ ...state, startMonitoring, stopMonitoring, addLog, resetMonitoring }}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoringContext() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error("useMonitoringContext must be used within a MonitoringProvider");
  }
  return context;
}