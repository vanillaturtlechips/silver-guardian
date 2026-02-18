import { analysisClient } from './grpc-client';
import { 
  AnalysisRequest,
  LoginRequest, 
  GetProfileRequest,
  GetHistoryRequest
} from '../generated/analysis';

// 프론트엔드에서 사용하는 요청 타입 정의
export interface AnalysisReq {
  videoUrl: string;
  sensitivity: "low" | "medium" | "high";
  scanInterval: number;
}

export const api = {
  // 1. 분석 요청
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

  // 2. 결과 조회
  getAnalysisResult: async (jobId: string) => {
    return analysisClient.getResult({ jobId });
  },

  // 3. 구글 로그인
  loginWithGoogle: async (idToken: string) => {
    const request = LoginRequest.create({ idToken });
    return analysisClient.loginWithGoogle(request);
  },

  // 4. 내 프로필 조회
  getUserProfile: async (userId: string) => {
    const request = GetProfileRequest.create({ userId });
    return analysisClient.getUserProfile(request);
  },

  // 5. 히스토리 조회
  getUserHistory: async (userId: string, page: number = 1) => {
    const request = GetHistoryRequest.create({ 
      userId, 
      page, 
      pageSize: 10 
    });
    return analysisClient.getUserHistory(request);
  }
};

// 유틸리티: 유튜브 ID 추출
export function extractYouTubeId(url: string): string | null {
  const regex = /(?:v=|be\/|embed\/|shorts\/|live\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}