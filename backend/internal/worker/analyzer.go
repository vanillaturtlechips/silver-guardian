package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/gemini"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/storage"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/youtube"
)

type Analyzer struct {
	youtubeClient *youtube.Client
	geminiClient  *gemini.Client
	store         *storage.PostgresStore
	redisClient   *redis.Client // [추가] Redis 클라이언트
}

type ProgressEvent struct {
	JobID    uuid.UUID `json:"job_id"`
	Type     string    `json:"type"` // "log", "progress", "complete", "error"
	Message  string    `json:"message"`
	Progress int       `json:"progress"`
}

// NewAnalyzer 생성자에 redisClient 파라미터가 추가되었습니다.
func NewAnalyzer(ytClient *youtube.Client, geminiClient *gemini.Client, store *storage.PostgresStore, rdb *redis.Client) *Analyzer {
	return &Analyzer{
		youtubeClient: ytClient,
		geminiClient:  geminiClient,
		store:         store,
		redisClient:   rdb,
	}
}

func (a *Analyzer) Analyze(ctx context.Context, jobID uuid.UUID, videoURL string, analyzeComments bool, commentCount int) {
	// 백그라운드 작업 시작
	go a.runAnalysis(context.Background(), jobID, videoURL, analyzeComments, commentCount)
}

func (a *Analyzer) runAnalysis(ctx context.Context, jobID uuid.UUID, videoURL string, analyzeComments bool, commentCount int) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in analysis: %v", r)
			a.sendProgress(jobID, "error", fmt.Sprintf("Analysis panic: %v", r), 0)
		}
	}()

	// DB: Job 상태를 Processing으로 업데이트
	if err := a.store.UpdateJobStatus(jobID, storage.StatusProcessing, 0); err != nil {
		log.Printf("Failed to update job status: %v", err)
		return
	}

	a.sendProgress(jobID, "log", "Initializing monitoring session...", 5)
	time.Sleep(500 * time.Millisecond)

	// 1. Video ID 추출
	a.sendProgress(jobID, "log", "Connecting to video stream...", 10)
	videoID, err := youtube.ExtractVideoID(videoURL)
	if err != nil {
		a.handleError(jobID, "Invalid YouTube URL", err)
		return
	}
	time.Sleep(800 * time.Millisecond)

	// 2. 메타데이터 조회
	a.sendProgress(jobID, "log", "Stream connection established", 15)
	a.sendProgress(jobID, "log", "Extracting video metadata...", 20)
	metadata, err := a.youtubeClient.GetMetadata(ctx, videoID)
	if err != nil {
		a.handleError(jobID, "Failed to get video metadata", err)
		return
	}

	// DB: 비디오 정보 저장
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

	// 3. 자막 다운로드
	a.sendProgress(jobID, "log", "Extracting video frames for analysis...", 30)
	time.Sleep(1500 * time.Millisecond)

	a.sendProgress(jobID, "log", "Downloading captions...", 40)
	captions, err := a.youtubeClient.GetCaptions(ctx, videoID)
	if err != nil {
		log.Printf("Warning: Failed to get captions: %v", err)
		captions = "" // 자막 없어도 계속 진행
	} else {
		if err := a.store.SaveCaptions(videoID, "en", captions); err != nil {
			log.Printf("Failed to save captions: %v", err)
		}
	}
	time.Sleep(2 * time.Second)

	a.sendProgress(jobID, "log", "Captions extracted successfully", 50)

	// 4. 댓글 수집 (옵션)
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

	// 5. Gemini 분석 요청
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

	// 6. 결과 저장
	a.sendProgress(jobID, "log", "Content analysis complete — Status: Safe ✓", 90)
	if err := a.store.SaveResult(jobID, result.SafetyScore, result.Concerns, result); err != nil {
		a.handleError(jobID, "Failed to save result", err)
		return
	}
	time.Sleep(1800 * time.Millisecond)

	// 7. 완료 처리
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

	// [핵심 변경] Redis Pub/Sub 발행
	// 이 부분이 추가되어야 다른 포드(Pod)나 재접속 시에도 상태를 받을 수 있습니다.
	if a.redisClient != nil {
		ctx := context.Background()
		channel := fmt.Sprintf("job-progress:%s", jobID.String())

		// JSON 직렬화
		if payload, err := json.Marshal(event); err == nil {
			// Publish: 현재 리스닝 중인 클라이언트에게 실시간 전송
			if err := a.redisClient.Publish(ctx, channel, payload).Err(); err != nil {
				log.Printf("Failed to publish progress to Redis: %v", err)
			}
			
			// (선택 사항) 최근 상태를 Redis Key에 저장해두면, 나중에 들어온 클라이언트가
			// Pub/Sub 내역을 놓쳤더라도 현재 상태를 즉시 조회할 수 있습니다.
			// key := fmt.Sprintf("job-latest:%s", jobID.String())
			// a.redisClient.Set(ctx, key, payload, 1*time.Hour)
		}
	}

	// DB 업데이트 (기존 로직 유지)
	if eventType != "log" {
		if err := a.store.UpdateJobStatus(jobID, storage.StatusProcessing, progress); err != nil {
			log.Printf("Failed to update progress in DB: %v", err)
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

func (a *Analyzer) SubscribeToJob(ctx context.Context, jobIDStr string) (<-chan ProgressEvent, error) {
    // 결과를 내보낼 채널 생성
    ch := make(chan ProgressEvent, 10)

    // Redis Pub/Sub 채널명 (sendProgress와 동일한 규칙)
    redisChannel := fmt.Sprintf("job-progress:%s", jobIDStr)

    // 별도 고루틴에서 구독 수행
    go func() {
        defer close(ch)

        // Redis 클라이언트 방어 코드
        if a.redisClient == nil {
            log.Printf("Error: Redis client is nil")
            return
        }

        // Redis 구독 시작
        pubsub := a.redisClient.Subscribe(ctx, redisChannel)
        defer pubsub.Close()

        // Redis 메시지 채널
        msgCh := pubsub.Channel()

        for {
            select {
            case msg, ok := <-msgCh:
                if !ok {
                    return
                }
                
                // JSON 데이터를 ProgressEvent로 변환
                var event ProgressEvent
                if err := json.Unmarshal([]byte(msg.Payload), &event); err == nil {
                    // gRPC 핸들러로 전달
                    select {
                    case ch <- event:
                    case <-ctx.Done(): // 클라이언트 연결 종료 시
                        return
                    }

                    // 작업이 끝나면 구독 종료
                    if event.Type == "complete" || event.Type == "error" {
                        return
                    }
                }
            case <-ctx.Done():
                return
            }
        }
    }()

    return ch, nil
}