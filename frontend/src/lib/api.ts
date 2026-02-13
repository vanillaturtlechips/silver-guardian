// API service for future Go-based sidecar integration
// Replace BASE_URL with your Go backend endpoint

const DEFAULT_BASE_URL = "http://localhost:8080";

export interface AnalysisRequest {
  videoUrl: string;
  sensitivity: "low" | "medium" | "high";
  scanInterval: number;
}

export interface AnalysisResult {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  safetyScore?: number;
}

export async function submitVideoForAnalysis(
  baseUrl: string,
  request: AnalysisRequest
): Promise<{ id: string }> {
  const res = await fetch(`${baseUrl || DEFAULT_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getAnalysisStatus(
  baseUrl: string,
  id: string
): Promise<AnalysisResult[]> {
  const res = await fetch(`${baseUrl || DEFAULT_BASE_URL}/api/analyze/${id}/status`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function extractYouTubeId(url: string): string | null {
  // 일반 주소, 쇼츠, 공유 링크, 임베드 등 모든 타입 지원
  const regex = /(?:v=|be\/|embed\/|shorts\/|live\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}