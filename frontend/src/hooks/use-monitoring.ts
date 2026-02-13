import { useState, useCallback, useRef } from "react";

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

const MOCK_SEQUENCE: { delay: number; type: LogEntry["type"]; message: string }[] = [
  { delay: 500, type: "info", message: "Initializing monitoring session…" },
  { delay: 1200, type: "info", message: "Connecting to video stream…" },
  { delay: 800, type: "success", message: "Stream connection established" },
  { delay: 1500, type: "info", message: "Extracting video frames for analysis…" },
  { delay: 2000, type: "info", message: "Captions extracted successfully" },
  { delay: 1000, type: "info", message: "Sending frames to Gemini AI engine…" },
  { delay: 2500, type: "info", message: "Analyzing content with Gemini Vision…" },
  { delay: 1800, type: "success", message: "Content analysis complete — Status: Safe ✓" },
  { delay: 1000, type: "info", message: "Monitoring active — next scan in 30s" },
];

export function useMonitoring() {
  const [state, setState] = useState<MonitoringState>({
    isScanning: false,
    safetyScore: 0,
    engineStatus: "idle",
    logs: [],
    videoId: null,
  });

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    (videoId: string) => {
      // Clear previous timeouts
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      setState((prev) => ({
        ...prev,
        isScanning: true,
        engineStatus: "scanning",
        videoId,
        logs: [],
        safetyScore: 0,
      }));

      let cumulativeDelay = 0;
      MOCK_SEQUENCE.forEach((entry, i) => {
        cumulativeDelay += entry.delay;
        const t = setTimeout(() => {
          addLog(entry.type, entry.message);
          // Update safety score progressively
          const progress = ((i + 1) / MOCK_SEQUENCE.length) * 94;
          setState((prev) => ({
            ...prev,
            safetyScore: Math.round(progress),
            ...(i === MOCK_SEQUENCE.length - 1
              ? { isScanning: false, engineStatus: "active" as const }
              : {}),
          }));
        }, cumulativeDelay);
        timeoutsRef.current.push(t);
      });
    },
    [addLog]
  );

  const stopMonitoring = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setState((prev) => ({
      ...prev,
      isScanning: false,
      engineStatus: "idle",
    }));
    addLog("info", "Monitoring session stopped");
  }, [addLog]);

  return { ...state, startMonitoring, stopMonitoring, addLog };
}
