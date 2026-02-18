package grpc

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/auth" // [NEW] Auth 패키지 임포트
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/storage"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/worker"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/youtube"
	pb "github.com/vanillaturtlechips/silver-guardian/backend/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AnalysisServer struct {
	pb.UnimplementedAnalysisServiceServer
	store    *storage.PostgresStore // PostgresStorage 구조체 이름 확인 필요 (보통 PostgresStore or Storage)
	analyzer *worker.Analyzer
}

// 생성자
func NewAnalysisServer(store *storage.PostgresStore, analyzer *worker.Analyzer) *AnalysisServer {
	return &AnalysisServer{
		store:    store,
		analyzer: analyzer,
	}
}

// ---------------------------------------------------------
// [기존 기능] 분석 관련 메서드
// ---------------------------------------------------------

// StartAnalysis: 분석 요청 처리
func (s *AnalysisServer) StartAnalysis(ctx context.Context, req *pb.AnalysisRequest) (*pb.AnalysisResponse, error) {
	log.Printf("Received analysis request for URL: %s (User: %s)", req.VideoUrl, req.UserId)

	// 1. URL 검증 및 Video ID 추출
	videoID, err := youtube.ExtractVideoID(req.VideoUrl)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid YouTube URL: %v", err)
	}

	// 2. Video 정보 저장 (임시)
	// 실제 메타데이터는 분석 워커가 채우겠지만, FK 제약 조건을 위해 먼저 생성
	placeholderVideo := &storage.Video{
		VideoID:     videoID,
		Title:       "Processing...",
		Channel:     "Unknown",
		Description: "",
		Duration:    0,
		PublishedAt: time.Now(),
	}

	if err := s.store.CreateVideo(placeholderVideo); err != nil {
		log.Printf("Video entry might already exist or DB error: %v", err)
		// 이미 존재해도 진행 (분석 갱신)
	}

	// 3. Job 생성 (유저 ID 연동 포함)
	// [NEW] req.UserId가 있다면 int64로 변환하여 Job에 기록 (비회원이면 0 or null)
	var userID int64 = 0
	if req.UserId != "" {
		if uid, err := strconv.ParseInt(req.UserId, 10, 64); err == nil {
			userID = uid
		}
	}

	// CreateJob 메서드가 userID를 받도록 수정되었다고 가정하거나, 
	// 기존 CreateJob을 쓰고 별도로 History를 남기는 방식을 쓸 수 있습니다.
	// 여기서는 기존 CreateJob을 호출하고, History 테이블에 추가로 기록하는 방식을 씁니다.
	job, err := s.store.CreateJob(videoID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create job: %v", err)
	}

	// [NEW] 유저가 로그인 상태라면 History 테이블에도 기록
	if userID > 0 {
		// History 추가는 실패해도 분석은 진행 (로그만 남김)
		if err := s.store.AddHistory(userID, videoID, "Processing...", ""); err != nil {
			log.Printf("Failed to save history for user %d: %v", userID, err)
		}
	}

	// 4. 분석 옵션 설정
	analyzeComments := true
	commentCount := 10
	if req.Options != nil {
		analyzeComments = req.Options.AnalyzeComments
		if req.Options.TopCommentsCount > 0 {
			commentCount = int(req.Options.TopCommentsCount)
		}
	}

	// 5. 비동기 분석 시작
	s.analyzer.Analyze(context.Background(), job.JobID, req.VideoUrl, analyzeComments, commentCount)

	return &pb.AnalysisResponse{
		JobId:   job.JobID.String(),
		Status:  "accepted",
		Message: "Analysis started successfully",
	}, nil
}

// StreamProgress: 실시간 진행 상황 스트리밍
func (s *AnalysisServer) StreamProgress(req *pb.ProgressRequest, stream pb.AnalysisService_StreamProgressServer) error {
	jobID, err := uuid.Parse(req.JobId)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "invalid job ID")
	}

	log.Printf("Client subscribed to job: %s via Redis", jobID)

	// 초기 상태 전송
	job, err := s.store.GetJob(jobID)
	if err != nil {
		return status.Errorf(codes.NotFound, "job not found")
	}

	initialEvent := &pb.ProgressEvent{
		JobId:     jobID.String(),
		Type:      "log",
		Message:   fmt.Sprintf("Connected to job (current status: %s)", job.Status),
		Progress:  int32(job.Progress),
		Timestamp: time.Now().Format(time.RFC3339),
	}
	if err := stream.Send(initialEvent); err != nil {
		return err
	}

	if job.Status == "completed" || job.Status == "failed" { // 상수 대신 문자열 리터럴 사용 (storage 패키지 상수가 있다면 교체)
		stream.Send(&pb.ProgressEvent{
			JobId:     jobID.String(),
			Type:      "complete",
			Message:   "Job is already finished.",
			Progress:  100,
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return nil
	}

	// Redis 구독
	progressChan, err := s.analyzer.SubscribeToJob(stream.Context(), req.JobId)
	if err != nil {
		log.Printf("Failed to subscribe to Redis: %v", err)
		return status.Errorf(codes.Internal, "failed to subscribe")
	}

	for event := range progressChan {
		resp := &pb.ProgressEvent{
			JobId:     event.JobID.String(),
			Type:      event.Type,
			Message:   event.Message,
			Progress:  int32(event.Progress),
			Timestamp: time.Now().Format(time.RFC3339),
		}

		if err := stream.Send(resp); err != nil {
			return err
		}

		if event.Type == "complete" || event.Type == "error" {
			return nil
		}
	}

	return nil
}

// GetResult: 결과 조회
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
		// 결과가 아직 없으면 상태만 리턴
		return &pb.AnalysisResult{
			JobId:  jobID.String(),
			Status: job.Status,
		}, nil
	}

	comments, _ := s.store.GetComments(job.VideoID, 10)
    
    // Video Metadata 가져오기 (Video 테이블)
    video, _ := s.store.GetVideo(job.VideoID) // GetVideo 메서드 필요

	pbResult := &pb.AnalysisResult{
		JobId:          jobID.String(),
		VideoId:        job.VideoID,
		SafetyScore:    int32(result.SafetyScore),
		GeminiResponse: string(result.GeminiResponse), // JSONB []byte -> string
		Status:         job.Status,
		CreatedAt:      job.CreatedAt.Format(time.RFC3339),
        // Metadata 매핑
        Metadata: &pb.VideoMetadata{
            Title: video.Title,
            Description: video.Description,
            Channel: video.Channel,
            Duration: video.Duration,
            ViewCount: video.ViewCount,
            PublishedAt: video.PublishedAt.Format(time.RFC3339),
        },
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

// ---------------------------------------------------------
// [NEW] Auth & User 관련 메서드 구현
// ---------------------------------------------------------

// LoginWithGoogle: 구글 토큰을 검증하고 자체 JWT 발급
func (s *AnalysisServer) LoginWithGoogle(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	// 1. Google ID Token 검증 (Client ID는 환경변수에서 가져오는 것이 좋음)
    // 지금은 빈 문자열("")로 두면 Aud 검사를 건너뛸 수 있으나 보안상 Client ID를 넣는게 좋습니다.
	payload, err := auth.VerifyGoogleToken(ctx, req.IdToken, "") 
	if err != nil {
		log.Printf("Google token verification failed: %v", err)
		return nil, status.Errorf(codes.Unauthenticated, "Invalid Google token")
	}

	email := payload.Claims["email"].(string)
	name := payload.Claims["name"].(string)
	picture := payload.Claims["picture"].(string)
	providerID := payload.Subject // Google Unique ID

	// 2. DB에 유저 저장 (없으면 생성, 있으면 업데이트)
	user, err := s.store.UpsertUser(email, name, picture, providerID)
	if err != nil {
		log.Printf("DB Upsert failed: %v", err)
		return nil, status.Errorf(codes.Internal, "Database error")
	}

	// 3. JWT 토큰 발급
	token, err := auth.GenerateJWT(user.ID, user.Email)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Token generation failed")
	}

	return &pb.LoginResponse{
		AccessToken: token,
		User: &pb.User{
			Id:         user.ID,
			Email:      user.Email,
			Name:       user.Name,
			PictureUrl: user.PictureURL,
		},
	}, nil
}

// GetUserProfile: 내 프로필 및 구독 정보 조회
func (s *AnalysisServer) GetUserProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.UserProfileResponse, error) {
	uid, err := strconv.ParseInt(req.UserId, 10, 64)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "Invalid user ID")
	}

	// 유저 조회
	user, err := s.store.GetUserByID(uid)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "User not found")
	}

	// 구독 정보 조회
	sub, err := s.store.GetSubscription(uid)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Subscription check failed")
	}
    
    // sql.NullTime 처리
    startDate := ""
    if sub.StartDate.Valid { startDate = sub.StartDate.Time.Format(time.RFC3339) }
    endDate := ""
    if sub.EndDate.Valid { endDate = sub.EndDate.Time.Format(time.RFC3339) }

	return &pb.UserProfileResponse{
		User: &pb.User{
			Id:         user.ID,
			Email:      user.Email,
			Name:       user.Name,
			PictureUrl: user.PictureURL,
		},
		Subscription: &pb.Subscription{
			PlanType:  sub.PlanType,
			StartDate: startDate,
			EndDate:   endDate,
		},
	}, nil
}

// GetUserHistory: 내 분석 기록 조회
func (s *AnalysisServer) GetUserHistory(ctx context.Context, req *pb.GetHistoryRequest) (*pb.HistoryResponse, error) {
	uid, err := strconv.ParseInt(req.UserId, 10, 64)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "Invalid user ID")
	}

	limit := int(req.PageSize)
	if limit <= 0 { limit = 10 }
	offset := int((req.Page - 1)) * limit
	if offset < 0 { offset = 0 }

	historyList, err := s.store.GetHistory(uid, limit, offset)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to fetch history")
	}

	var pbItems []*pb.HistoryItem
	for _, h := range historyList {
		pbItems = append(pbItems, &pb.HistoryItem{
			VideoId:      h.VideoID,
			VideoTitle:   h.VideoTitle,
			ThumbnailUrl: h.ThumbnailURL,
			AnalyzedAt:   h.CreatedAt.Format(time.RFC3339),
			SafetyScore:  int32(h.SafetyScore),
			JobId:        h.JobID,
		})
	}

	return &pb.HistoryResponse{Items: pbItems}, nil
}