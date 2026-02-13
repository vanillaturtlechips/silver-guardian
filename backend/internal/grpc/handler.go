package grpc

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "sync"
    "time"

    "github.com/google/uuid"
    pb "github.com/your-org/silver-guardian/backend/proto"
    "github.com/your-org/silver-guardian/backend/internal/storage"
    "github.com/your-org/silver-guardian/backend/internal/worker"
    "github.com/your-org/silver-guardian/backend/internal/youtube"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type AnalysisServer struct {
    pb.UnimplementedAnalysisServiceServer
    store    *storage.PostgresStore
    analyzer *worker.Analyzer
    
    // Job streaming management
    subscribers   map[uuid.UUID][]chan *pb.ProgressEvent
    subscribersMu sync.RWMutex
}

func NewAnalysisServer(store *storage.PostgresStore, analyzer *worker.Analyzer) *AnalysisServer {
    server := &AnalysisServer{
        store:       store,
        analyzer:    analyzer,
        subscribers: make(map[uuid.UUID][]chan *pb.ProgressEvent),
    }

    // Start progress event dispatcher
    go server.dispatchProgressEvents()

    return server
}

// StartAnalysis handles analysis request
func (s *AnalysisServer) StartAnalysis(ctx context.Context, req *pb.AnalysisRequest) (*pb.AnalysisResponse, error) {
    log.Printf("Received analysis request for URL: %s", req.VideoUrl)

    // Validate URL
    videoID, err := youtube.ExtractVideoID(req.VideoUrl)
    if err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid YouTube URL: %v", err)
    }

    // ✅ 추가: 먼저 video 생성 (placeholder)
    placeholderVideo := &storage.Video{
        VideoID: videoID,
        Title:   "Processing...",
        Channel: "Unknown",
    }
    if err := s.store.CreateVideo(placeholderVideo); err != nil {
        // 이미 존재하면 무시
        log.Printf("Video already exists or error: %v", err)
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

    s.analyzer.Analyze(ctx, job.JobID, req.VideoUrl, analyzeComments, commentCount)

    return &pb.AnalysisResponse{
        JobId:   job.JobID.String(),
        Status:  "accepted",
        Message: "Analysis started successfully",
    }, nil
}

// StreamProgress streams real-time progress updates
func (s *AnalysisServer) StreamProgress(req *pb.ProgressRequest, stream pb.AnalysisService_StreamProgressServer) error {
    jobID, err := uuid.Parse(req.JobId)
    if err != nil {
        return status.Errorf(codes.InvalidArgument, "invalid job ID")
    }

    log.Printf("Client subscribed to job: %s", jobID)

    // Create progress channel for this subscriber
    progressChan := make(chan *pb.ProgressEvent, 50)
    
    // Register subscriber
    s.subscribersMu.Lock()
    s.subscribers[jobID] = append(s.subscribers[jobID], progressChan)
    s.subscribersMu.Unlock()

    // Cleanup on disconnect
    defer func() {
        s.subscribersMu.Lock()
        subs := s.subscribers[jobID]
        for i, ch := range subs {
            if ch == progressChan {
                s.subscribers[jobID] = append(subs[:i], subs[i+1:]...)
                break
            }
        }
        if len(s.subscribers[jobID]) == 0 {
            delete(s.subscribers, jobID)
        }
        s.subscribersMu.Unlock()
        close(progressChan)
        log.Printf("Client unsubscribed from job: %s", jobID)
    }()

    // Send initial status
    job, err := s.store.GetJob(jobID)
    if err != nil {
        return status.Errorf(codes.NotFound, "job not found")
    }

    initialEvent := &pb.ProgressEvent{
        JobId:     jobID.String(),
        Type:      "log",
        Message:   fmt.Sprintf("Connected to job (status: %s)", job.Status),
        Progress:  int32(job.Progress),
        Timestamp: time.Now().Format(time.RFC3339),
    }

    if err := stream.Send(initialEvent); err != nil {
        return err
    }

    // Stream events
    for {
        select {
        case event, ok := <-progressChan:
            if !ok {
                return nil
            }
            if err := stream.Send(event); err != nil {
                log.Printf("Failed to send event: %v", err)
                return err
            }

        case <-stream.Context().Done():
            return stream.Context().Err()
        }
    }
}

// GetResult retrieves final analysis result
func (s *AnalysisServer) GetResult(ctx context.Context, req *pb.ResultRequest) (*pb.AnalysisResult, error) {
    jobID, err := uuid.Parse(req.JobId)
    if err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid job ID")
    }

    // Get job
    job, err := s.store.GetJob(jobID)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, status.Errorf(codes.NotFound, "job not found")
        }
        return nil, status.Errorf(codes.Internal, "failed to get job: %v", err)
    }

    // Get result
    result, err := s.store.GetResult(jobID)
    if err != nil {
        if err == sql.ErrNoRows {
            // Job exists but result not ready yet
            return &pb.AnalysisResult{
                JobId:  jobID.String(),
                Status: job.Status,
            }, nil
        }
        return nil, status.Errorf(codes.Internal, "failed to get result: %v", err)
    }

    // Get comments
    comments, _ := s.store.GetComments(job.VideoID, 10)

    // Parse categories
    var categories []string
    json.Unmarshal([]byte(result.Categories), &categories)

    // Build response
    pbResult := &pb.AnalysisResult{
        JobId:       jobID.String(),
        VideoId:     job.VideoID,
        SafetyScore: int32(result.SafetyScore),
        Categories:  categories,
        GeminiResponse: result.GeminiResponse,
        Status:      job.Status,
        CreatedAt:   job.CreatedAt.Format(time.RFC3339),
    }

    if job.CompletedAt.Valid {
        pbResult.CompletedAt = job.CompletedAt.Time.Format(time.RFC3339)
    }

    // Add comments
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

// CancelAnalysis cancels an ongoing analysis
func (s *AnalysisServer) CancelAnalysis(ctx context.Context, req *pb.CancelRequest) (*pb.CancelResponse, error) {
    jobID, err := uuid.Parse(req.JobId)
    if err != nil {
        return nil, status.Errorf(codes.InvalidArgument, "invalid job ID")
    }

    // Update job status
    if err := s.store.UpdateJobStatus(jobID, storage.StatusCancelled, 0); err != nil {
        return nil, status.Errorf(codes.Internal, "failed to cancel job: %v", err)
    }

    // Notify subscribers
    s.notifySubscribers(jobID, &pb.ProgressEvent{
        JobId:     jobID.String(),
        Type:      "error",
        Message:   "Analysis cancelled by user",
        Progress:  0,
        Timestamp: time.Now().Format(time.RFC3339),
    })

    return &pb.CancelResponse{
        JobId:     jobID.String(),
        Cancelled: true,
        Message:   "Analysis cancelled successfully",
    }, nil
}

// dispatchProgressEvents listens to analyzer progress and dispatches to subscribers
func (s *AnalysisServer) dispatchProgressEvents() {
    progressChan := s.analyzer.GetProgressChannel()

    for event := range progressChan {
        pbEvent := &pb.ProgressEvent{
            JobId:     event.JobID.String(),
            Type:      event.Type,
            Message:   event.Message,
            Progress:  int32(event.Progress),
            Timestamp: time.Now().Format(time.RFC3339),
        }

        s.notifySubscribers(event.JobID, pbEvent)
    }
}

// notifySubscribers sends event to all subscribers of a job
func (s *AnalysisServer) notifySubscribers(jobID uuid.UUID, event *pb.ProgressEvent) {
    s.subscribersMu.RLock()
    subscribers := s.subscribers[jobID]
    s.subscribersMu.RUnlock()

    for _, ch := range subscribers {
        select {
        case ch <- event:
        default:
            log.Printf("Subscriber channel full for job %s", jobID)
        }
    }
}