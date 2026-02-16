import { GrpcWebImpl, AnalysisServiceClientImpl, AnalysisRequest } from '../generated/analysis';

const GRPC_URL = import.meta.env.VITE_GRPC_URL || 'https://api.silver-guardian.site';

class GRPCClient {
  private client: AnalysisServiceClientImpl;

  constructor() {
    // ts-proto의 GrpcWebImpl을 사용하여 통신 설정
    const rpc = new GrpcWebImpl(GRPC_URL, {
      debug: false,
    });
    // 클라이언트 인스턴스 생성
    this.client = new AnalysisServiceClientImpl(rpc);
  }

  async startAnalysis(videoUrl: string) {
    // 요청 객체를 단순한 JSON 객체로 전달 가능
    const request: AnalysisRequest = {
      videoUrl: videoUrl,
      options: undefined // 필요한 경우 옵션 추가
    };

    // Promise 기반으로 동작하므로 코드가 훨씬 깔끔해짐
    try {
      const response = await this.client.StartAnalysis(request);
      return {
        jobId: response.jobId,
        status: response.status,
        message: response.message,
      };
    } catch (err) {
      throw err;
    }
  }

  streamProgress(jobId: string, onEvent: any, onEnd: any, onError: any) {
    const stream = this.client.StreamProgress({ jobId });
    
    // Observable을 구독하는 형태
    const subscription = stream.subscribe({
      next: (response) => {
        onEvent({
          jobId: response.jobId,
          type: response.type,
          message: response.message,
          progress: response.progress,
          timestamp: response.timestamp,
        });
      },
      error: (err) => onError(err),
      complete: () => onEnd(),
    });

    return subscription; // 필요 시 구독 해제(unsubscribe)를 위해 반환
  }

  async getResult(jobId: string) {
    try {
      const response = await this.client.GetResult({ jobId });
      return {
        jobId: response.jobId,
        videoId: response.videoId,
        safetyScore: response.safetyScore,
        status: response.status,
        // 필요한 다른 필드들도 .getSomething() 없이 직접 접근 가능
        geminiResponse: response.geminiResponse, 
      };
    } catch (err) {
      throw err;
    }
  }
}

export const grpcClient = new GRPCClient();