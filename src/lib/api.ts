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
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
