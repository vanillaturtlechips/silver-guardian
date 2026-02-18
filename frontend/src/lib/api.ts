// @ts-nocheck
import { analysisClient } from './grpc-client';
import { 
  AnalysisRequest,
  LoginRequest, 
  GetProfileRequest,
  GetHistoryRequest
} from '../generated/analysis';

export interface AnalysisReq {
  videoUrl: string;
  sensitivity: "low" | "medium" | "high";
  scanInterval: number;
}

export const api = {
  submitVideoForAnalysis: async (req: AnalysisReq, userId: string = "") => {
    const request = AnalysisRequest.create({
      videoUrl: req.videoUrl,
      options: {
        sensitivity: req.sensitivity === "high" ? 2 : req.sensitivity === "medium" ? 1 : 0,
        analyzeComments: true,
        topCommentsCount: 10
      },
      userId: userId
    });
    return analysisClient.startAnalysis(request);
  },

  getAnalysisResult: async (jobId: string) => {
    return analysisClient.getResult({ jobId });
  },

  loginWithGoogle: async (idToken: string) => {
    const request = LoginRequest.create({ idToken });
    return analysisClient.loginWithGoogle(request);
  },

  getUserProfile: async (userId: string) => {
    const request = GetProfileRequest.create({ userId });
    return analysisClient.getUserProfile(request);
  },

  // 히스토리 조회: 어떤 필드명이 오든 무조건 잡아내는 매핑 로직
  getUserAnalysisHistory: async (userId: string = "") => {
    const request = GetHistoryRequest.create({ userId, page: 1, pageSize: 20 });
    
    try {
      const response = await analysisClient.getUserHistory(request);
      
      // 서버에서 보내주는 실제 배열 필드를 찾습니다.
      const rawItems = response.items || response.history || response.analysisHistory || [];
      
      return rawItems.map((item, index) => {
        // gRPC 객체가 toObject() 상태인지 아닌지에 따라 필드명이 다를 수 있으므로 유연하게 매핑
        const normalized = {
          jobId: item.jobId || item.job_id || `item-${index}`,
          videoUrl: item.videoUrl || item.video_url || item.videoId || item.video_id || "",
          title: item.videoTitle || "제목 없음",
          safetyScore: item.safetyScore ?? item.safety_score ?? 0,
          createdAt: item.analyzedAt || item.createdAt || item.created_at || new Date().toISOString()
        };
        console.log("item 전체:", JSON.stringify(item)); // 이 줄 추가
        console.log("jobId:", normalized.jobId); // 임시 확인용
        return normalized;
      });
    } catch (error) {
      console.error("gRPC 히스토리 조회 실패:", error);
      return []; 
    }
  }
};

export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // 이미 순수 11자리 ID인 경우
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }
  
  const regex = /(?:v=|be\/|embed\/|shorts\/|live\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}