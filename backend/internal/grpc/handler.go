package grpc

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/your-org/silver-guardian/backend/internal/storage"
	"github.com/your-org/silver-guardian/backend/internal/worker"
	"github.com/your-org/silver-guardian/backend/internal/youtube"
	pb "github.com/your-org/silver-guardian/backend/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AnalysisServer struct {
	pb.UnimplementedAnalysisServiceServer
	store    *storage.PostgresStore
	analyzer *worker.Analyzer
}

func NewAnalysisServer(store *storage.PostgresStore, analyzer *worker.Analyzer) *AnalysisServer {
	return &AnalysisServer{
		store:    store,
		analyzer: analyzer,
	}
}

// StartAnalysis handles analysis request
func (s *AnalysisServer) StartAnalysis(ctx context.Context, req *pb.AnalysisRequest) (*pb.AnalysisResponse, error) {
	log.Printf("Received analysis request for URL: %s", req.VideoUrl)

	// Validate URL
	videoID, err := youtube.ExtractVideoID(req.VideoUrl)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid YouTube URL: %v", err)
	}

	// [수정 1] Duration을 숫자(0)로 변경하여 타입 에러 해결
	placeholderVideo := &storage.Video{
		VideoID:     videoID,
		Title:       "Processing...",
		Channel:     "Unknown",
		Description: "",
		Duration:    0, // "00:00" -> 0 (int64)
		PublishedAt: time.Now(),
	}
	
	// 이미 존재하면 무시 (CreateVideo 내부 로직 의존)
	if err := s.store.CreateVideo(placeholderVideo); err != nil {
		log.Printf("Video entry might already exist or DB error: %v", err)
	}

	// Create job
	job, err := s.store.CreateJob(videoID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create job: %v", err)
	}

	// Start analysis in background
	analyzeComments := true
	commentCount := 10
	if req.Options != nil {
		analyzeComments = req.Options.AnalyzeComments
		if req.Options.TopCommentsCount > 0 {
			commentCount = int(req.Options.TopCommentsCount)
		}
	}

	// 비동기 분석 시작
	s.analyzer.Analyze(context.Background(), job.JobID, req.VideoUrl, analyzeComments, commentCount)

	return &pb.AnalysisResponse{
		JobId:   job.JobID.String(),
		Status:  "accepted",
		Message: "Analysis started successfully",
	}, nil
}

// StreamProgress streams real-time progress updates via Redis Pub/Sub
func (s *AnalysisServer) StreamProgress(req *pb.ProgressRequest, stream pb.AnalysisService_StreamProgressServer) error {
	// Job ID 유효성 검사
	jobID, err := uuid.Parse(req.JobId)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "invalid job ID")
	}

	log.Printf("Client subscribed to job: %s via Redis", jobID)

	// 1. 초기 상태 전송 (DB 조회)
	job, err := s.store.GetJob(jobID)
	if err != nil {
		return status.Errorf(codes.NotFound, "job not found")
	}

	// [수정 2] pb.AnalysisUpdate -> pb.ProgressEvent로 변경
	initialEvent := &pb.ProgressEvent{
		JobId:     jobID.String(),
		Type:      "log", // Status -> Type
		Message:   fmt.Sprintf("Connected to job (current status: %s)", job.Status),
		Progress:  int32(job.Progress),
		Timestamp: time.Now().Format(time.RFC3339),
	}
	if err := stream.Send(initialEvent); err != nil {
		return err
	}

	// 이미 완료된 작업이면 종료 신호 전송
	if job.Status == storage.StatusCompleted || job.Status == storage.StatusFailed {
		finalEvent := &pb.ProgressEvent{
			JobId:     jobID.String(),
			Type:      "complete",
			Message:   "Job is already finished.",
			Progress:  100,
			Timestamp: time.Now().Format(time.RFC3339),
		}
		stream.Send(finalEvent)
		return nil
	}

	// 2. Redis 구독 시작
	progressChan, err := s.analyzer.SubscribeToJob(stream.Context(), req.JobId)
	if err != nil {
		log.Printf("Failed to subscribe to Redis channel: %v", err)
		return status.Errorf(codes.Internal, "failed to subscribe to progress updates")
	}

	// 3. 채널 이벤트 전송
	for event := range progressChan {
		// [수정 2] pb.AnalysisUpdate -> pb.ProgressEvent로 변경
		resp := &pb.ProgressEvent{
			JobId:     event.JobID.String(),
			Type:      event.Type,
			Message:   event.Message,
			Progress:  int32(event.Progress),
			Timestamp: time.Now().Format(time.RFC3339),
		}

		if err := stream.Send(resp); err != nil {
			log.Printf("Failed to send gRPC stream event: %v", err)
			return err
		}

		if event.Type == "complete" || event.Type == "error" {
			return nil
		}
	}

	return nil
}

// GetResult retrieves final analysis result
func (s *AnalysisServer) GetResult(ctx context.Context, req *pb.ResultRequest) (*pb.AnalysisResult, error) {
	jobID, err := uuid.Parse(req.JobId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid job ID")
	}

	job, err := s.store.GetJob(jobID)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "job not found")
	}

	result, err := s.store.GetResult(jobID)
	if err != nil {
		return &pb.AnalysisResult{
			JobId:  jobID.String(),
			Status: job.Status,
		}, nil
	}

	comments, _ := s.store.GetComments(job.VideoID, 10)

	pbResult := &pb.AnalysisResult{
		JobId:          jobID.String(),
		VideoId:        job.VideoID,
		SafetyScore:    int32(result.SafetyScore),
		GeminiResponse: result.GeminiResponse,
		Status:         job.Status,
		CreatedAt:      job.CreatedAt.Format(time.RFC3339),
	}

	if job.CompletedAt.Valid {
		pbResult.CompletedAt = job.CompletedAt.Time.Format(time.RFC3339)
	}

	for _, c := range comments {
		pbResult.TopComments = append(pbResult.TopComments, &pb.Comment{
			Author: c.Author,
			Text:   c.Text,
			Likes:  c.Likes,
			Rank:   int32(c.Rank),
		})
	}

	return pbResult, nil
}