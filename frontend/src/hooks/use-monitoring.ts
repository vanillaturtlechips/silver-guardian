import { useState, useCallback, useRef } from "react";
import { grpcClient } from "@/lib/grpc-client";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface MonitoringState {
  isScanning: boolean;
  safetyScore: number;
  engineStatus: "idle" | "active" | "scanning" | "error";
  logs: LogEntry[];
  videoId: string | null;
}

export function useMonitoring() {
  const [state, setState] = useState<MonitoringState>({
    isScanning: false,
    safetyScore: 0,
    engineStatus: "idle",
    logs: [],
    videoId: null,
  });

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
      // Cancel previous stream if exists
      if (streamRef.current) {
        streamRef.current.cancel();
      }

      setState((prev) => ({
        ...prev,
        isScanning: true,
        engineStatus: "scanning",
        logs: [],
        safetyScore: 0,
      }));

      try {
        // Start analysis
        const response = await grpcClient.startAnalysis(videoUrl);

        const jobId = (response as any).jobId;

        // Stream progress
        streamRef.current = grpcClient.streamProgress(
          jobId,
          (event) => {
            // Add log
            const logType = event.type === "error" ? "error" : 
                           event.type === "complete" ? "success" : "info";
            addLog(logType, event.message);

            // Update progress
            setState((prev) => ({
              ...prev,
              safetyScore: event.progress || prev.safetyScore,
              isScanning: event.type !== "complete" && event.type !== "error",
              engineStatus: event.type === "complete" ? "active" : 
                           event.type === "error" ? "error" : "scanning",
            }));
          },
          () => {
            // Stream ended
            setState((prev) => ({
              ...prev,
              isScanning: false,
              engineStatus: "active",
            }));
          },
          (error) => {
            console.error("Stream error:", error);
            addLog("error", `Connection error: ${error.message}`);
            setState((prev) => ({
              ...prev,
              isScanning: false,
              engineStatus: "error",
            }));
          }
        );
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
    if (streamRef.current) {
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

  return { ...state, startMonitoring, stopMonitoring, addLog };
}