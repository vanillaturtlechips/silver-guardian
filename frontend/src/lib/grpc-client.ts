import * as pb from '../generated/analysis_pb.js';
import { AnalysisServiceClient } from '../generated/AnalysisServiceClientPb';

const GRPC_URL = import.meta.env.VITE_GRPC_URL || 'http://localhost:8080';

class GRPCClient {
  private client: AnalysisServiceClient;

  constructor() {
    this.client = new AnalysisServiceClient(GRPC_URL);
  }

  startAnalysis(videoUrl: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = new (pb as any).proto.analysis.AnalysisRequest();
      request.setVideoUrl(videoUrl);

      this.client.startAnalysis(request, {}, (err: any, response: any) => {
        if (err) reject(err);
        else resolve({
          jobId: response.getJobId(),
          status: response.getStatus(),
          message: response.getMessage(),
        });
      });
    });
  }

  streamProgress(jobId: string, onEvent: any, onEnd: any, onError: any) {
    const request = new (pb as any).proto.analysis.ProgressRequest();
    request.setJobId(jobId);

    const stream = this.client.streamProgress(request, {});
    
    stream.on('data', (response: any) => {
      onEvent({
        jobId: response.getJobId(),
        type: response.getType(),
        message: response.getMessage(),
        progress: response.getProgress(),
        timestamp: response.getTimestamp(),
      });
    });

    stream.on('end', onEnd);
    stream.on('error', onError);
    
    return stream;
  }

  getResult(jobId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = new (pb as any).proto.analysis.ResultRequest();
      request.setJobId(jobId);

      this.client.getResult(request, {}, (err: any, response: any) => {
        if (err) reject(err);
        else resolve({
          jobId: response.getJobId(),
          videoId: response.getVideoId(),
          safetyScore: response.getSafetyScore(),
          status: response.getStatus(),
        });
      });
    });
  }
}

export const grpcClient = new GRPCClient();