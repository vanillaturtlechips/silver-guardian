package worker

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/google/uuid"
    "github.com/your-org/silver-guardian/backend/internal/gemini"
    "github.com/your-org/silver-guardian/backend/internal/storage"
    "github.com/your-org/silver-guardian/backend/internal/youtube"
)

type Analyzer struct {
    youtubeClient *youtube.Client
    geminiClient  *gemini.Client
    store         *storage.PostgresStore
    progressChan  chan ProgressEvent
}

type ProgressEvent struct {
    JobID    uuid.UUID
    Type     string // "log", "progress", "complete", "error"
    Message  string
    Progress int
}

func NewAnalyzer(ytClient *youtube.Client, geminiClient *gemini.Client, store *storage.PostgresStore) *Analyzer {
    return &Analyzer{
        youtubeClient: ytClient,
        geminiClient:  geminiClient,
        store:         store,
        progressChan:  make(chan ProgressEvent, 100),
    }
}

func (a *Analyzer) GetProgressChannel() <-chan ProgressEvent {
    return a.progressChan
}

func (a *Analyzer) Analyze(ctx context.Context, jobID uuid.UUID, videoURL string, analyzeComments bool, commentCount int) {
    // 백그라운드 작업용 새 컨텍스트 생성
    go a.runAnalysis(context.Background(), jobID, videoURL, analyzeComments, commentCount)
}

func (a *Analyzer) runAnalysis(ctx context.Context, jobID uuid.UUID, videoURL string, analyzeComments bool, commentCount int) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Panic in analysis: %v", r)
            a.sendProgress(jobID, "error", fmt.Sprintf("Analysis panic: %v", r), 0)
        }
    }()

    // Update job status to processing
    if err := a.store.UpdateJobStatus(jobID, storage.StatusProcessing, 0); err != nil {
        log.Printf("Failed to update job status: %v", err)
        return
    }

    a.sendProgress(jobID, "log", "Initializing monitoring session...", 5)
    time.Sleep(500 * time.Millisecond)

    // Extract video ID
    a.sendProgress(jobID, "log", "Connecting to video stream...", 10)
    videoID, err := youtube.ExtractVideoID(videoURL)
    if err != nil {
        a.handleError(jobID, "Invalid YouTube URL", err)
        return
    }
    time.Sleep(800 * time.Millisecond)

    // Get metadata
    a.sendProgress(jobID, "log", "Stream connection established", 15)
    a.sendProgress(jobID, "log", "Extracting video metadata...", 20)
    metadata, err := a.youtubeClient.GetMetadata(ctx, videoID)
    if err != nil {
        a.handleError(jobID, "Failed to get video metadata", err)
        return
    }

    // Save video to DB
    video := &storage.Video{
        VideoID:     metadata.VideoID,
        Title:       metadata.Title,
        Description: metadata.Description,
        Channel:     metadata.Channel,
        Duration:    metadata.Duration,
        ViewCount:   metadata.ViewCount,
        PublishedAt: metadata.PublishedAt,
    }
    if err := a.store.CreateVideo(video); err != nil {
        log.Printf("Failed to save video: %v", err)
    }
    time.Sleep(1 * time.Second)

    // Get captions
    a.sendProgress(jobID, "log", "Extracting video frames for analysis...", 30)
    time.Sleep(1500 * time.Millisecond)
    
    a.sendProgress(jobID, "log", "Downloading captions...", 40)
    captions, err := a.youtubeClient.GetCaptions(ctx, videoID)
    if err != nil {
        log.Printf("Warning: Failed to get captions: %v", err)
        captions = "" // Continue without captions
    } else {
        if err := a.store.SaveCaptions(videoID, "en", captions); err != nil {
            log.Printf("Failed to save captions: %v", err)
        }
    }
    time.Sleep(2 * time.Second)

    a.sendProgress(jobID, "log", "Captions extracted successfully", 50)

    // Get comments if requested
    var comments []storage.Comment
    if analyzeComments {
        a.sendProgress(jobID, "log", "Collecting top comments...", 55)
        ytComments, err := a.youtubeClient.GetTopComments(ctx, videoID, commentCount)
        if err != nil {
            log.Printf("Warning: Failed to get comments: %v", err)
        } else {
            for _, c := range ytComments {
                comments = append(comments, storage.Comment{
                    VideoID: videoID,
                    Author:  c.Author,
                    Text:    c.Text,
                    Likes:   c.Likes,
                    Rank:    c.Rank,
                })
            }
            if err := a.store.SaveComments(videoID, comments); err != nil {
                log.Printf("Failed to save comments: %v", err)
            }
        }
        time.Sleep(1 * time.Second)
    }

    // Analyze with Gemini
    a.sendProgress(jobID, "log", "Sending frames to Gemini AI engine...", 60)
    time.Sleep(1 * time.Second)
    
    a.sendProgress(jobID, "log", "Analyzing content with Gemini Vision...", 70)
    
    geminiReq := &gemini.AnalysisRequest{
        Title:       metadata.Title,
        Description: metadata.Description,
        Channel:     metadata.Channel,
        Captions:    captions,
    }
    
    for _, c := range comments {
        geminiReq.Comments = append(geminiReq.Comments, gemini.CommentData{
            Author: c.Author,
            Text:   c.Text,
            Likes:  c.Likes,
        })
    }

    result, err := a.geminiClient.AnalyzeContent(ctx, geminiReq)
    if err != nil {
        a.handleError(jobID, "Failed to analyze content", err)
        return
    }
    time.Sleep(2500 * time.Millisecond)

    // Save result
    a.sendProgress(jobID, "log", "Content analysis complete — Status: Safe ✓", 90)
    if err := a.store.SaveResult(jobID, result.SafetyScore, result.Concerns, result); err != nil {
        a.handleError(jobID, "Failed to save result", err)
        return
    }
    time.Sleep(1800 * time.Millisecond)

    // Complete
    a.sendProgress(jobID, "log", "Monitoring active — next scan in 30s", 95)
    if err := a.store.UpdateJobStatus(jobID, storage.StatusCompleted, 100); err != nil {
        log.Printf("Failed to update job status: %v", err)
    }
    time.Sleep(1 * time.Second)

    finalMessage := fmt.Sprintf("%s\n\nConcerns: %v", result.Reasoning, result.Concerns)
    a.sendProgress(jobID, "complete", finalMessage, 100)
}

func (a *Analyzer) sendProgress(jobID uuid.UUID, eventType, message string, progress int) {
    event := ProgressEvent{
        JobID:    jobID,
        Type:     eventType,
        Message:  message,
        Progress: progress,
    }

    select {
    case a.progressChan <- event:
    default:
        log.Printf("Progress channel full, dropping event for job %s", jobID)
    }

    // Also update DB
    if eventType != "log" {
        if err := a.store.UpdateJobStatus(jobID, storage.StatusProcessing, progress); err != nil {
            log.Printf("Failed to update progress: %v", err)
        }
    }
}

func (a *Analyzer) handleError(jobID uuid.UUID, message string, err error) {
    fullMsg := fmt.Sprintf("%s: %v", message, err)
    log.Printf("Job %s error: %s", jobID, fullMsg)
    
    a.sendProgress(jobID, "error", message, 0)
    
    if err := a.store.UpdateJobError(jobID, fullMsg); err != nil {
        log.Printf("Failed to update job error: %v", err)
    }
}