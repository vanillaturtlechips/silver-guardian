import { 
  GrpcWebImpl, 
  AnalysisServiceClientImpl, 
  AnalysisRequest,
  LoginRequest,
  GetProfileRequest,
  GetHistoryRequest
} from '../generated/analysis';

const GRPC_URL = import.meta.env.VITE_GRPC_URL || 'http://localhost:8080'; // 로컬 테스트 시 백엔드 포트 확인

class GRPCClient {
  private client: AnalysisServiceClientImpl;

  constructor() {
    const rpc = new GrpcWebImpl(GRPC_URL, {
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

  // 4. [NEW] 로그인
  async loginWithGoogle(request: LoginRequest) {
    return this.client.LoginWithGoogle(request);
  }

  // 5. [NEW] 프로필 조회
  async getUserProfile(request: GetProfileRequest) {
    return this.client.GetUserProfile(request);
  }

  // 6. [NEW] 히스토리 조회
  async getUserHistory(request: GetHistoryRequest) {
    return this.client.GetUserHistory(request);
  }
}

// export 이름을 api.ts와 맞춤
export const analysisClient = new GRPCClient();