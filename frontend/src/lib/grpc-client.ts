import { 
  GrpcWebImpl, 
  AnalysisServiceClientImpl, 
  AnalysisRequest,
  LoginRequest,
  GetProfileRequest,
  GetHistoryRequest
} from '../generated/analysis'; // 사용자님의 실제 경로 유지

// [핵심] 스마트 주소 결정 함수
const getGrpcUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8080"; // 로컬 개발용 Envoy 포트
  }
  // .env에 값이 있으면 쓰고, 없으면 기본 배포 주소 사용
  return import.meta.env.VITE_GRPC_URL || 'https://api.silver-guardian.site';
};

class GRPCClient {
  private client: AnalysisServiceClientImpl;

  constructor() {
    // 동적으로 결정된 URL을 주입합니다.
    const rpc = new GrpcWebImpl(getGrpcUrl(), {
      debug: false,
    });
    this.client = new AnalysisServiceClientImpl(rpc);
  }

  // 1. 분석 요청
  async startAnalysis(request: AnalysisRequest) {
    return this.client.StartAnalysis(request);
  }

  // 2. 진행 상황 스트리밍
  streamProgress(jobId: string) {
    return this.client.StreamProgress({ jobId });
  }

  // 3. 결과 조회
  async getResult(request: { jobId: string }) {
    return this.client.GetResult(request);
  }

  // 4. 로그인
  async loginWithGoogle(request: LoginRequest) {
    return this.client.LoginWithGoogle(request);
  }

  // 5. 프로필 조회
  async getUserProfile(request: GetProfileRequest) {
    return this.client.GetUserProfile(request);
  }

  // 6. 히스토리 조회
  async getUserHistory(request: GetHistoryRequest) {
    return this.client.GetUserHistory(request);
  }
}

export const analysisClient = new GRPCClient();