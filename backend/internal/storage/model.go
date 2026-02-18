package storage

import (
    "database/sql"
    "time"

    "github.com/google/uuid"
)

type Video struct {
    VideoID     string       `db:"video_id"`
    Title       string       `db:"title"`
    Description string       `db:"description"`
    Channel     string       `db:"channel"`
    Duration    int64        `db:"duration"`
    ViewCount   int64        `db:"view_count"`
    PublishedAt time.Time    `db:"published_at"`
    CreatedAt   time.Time    `db:"created_at"`
    UpdatedAt   time.Time    `db:"updated_at"`
}

type AnalysisJob struct {
    JobID        uuid.UUID      `db:"job_id"`
    VideoID      string         `db:"video_id"`
    Status       string         `db:"status"`
    Progress     int            `db:"progress"`
    CreatedAt    time.Time      `db:"created_at"`
    StartedAt    sql.NullTime   `db:"started_at"`
    CompletedAt  sql.NullTime   `db:"completed_at"`
    ErrorMessage sql.NullString `db:"error_message"`
}

type AnalysisResult struct {
    ResultID       int       `db:"result_id"`
    JobID          uuid.UUID `db:"job_id"`
    SafetyScore    int       `db:"safety_score"`
    Categories     string    `db:"categories"`     // JSON
    GeminiResponse string    `db:"gemini_response"` // JSON
    CreatedAt      time.Time `db:"created_at"`
}

type Caption struct {
    CaptionID int       `db:"caption_id"`
    VideoID   string    `db:"video_id"`
    Language  string    `db:"language"`
    Text      string    `db:"text"`
    CreatedAt time.Time `db:"created_at"`
}

type Comment struct {
    CommentID  int       `db:"comment_id"`
    VideoID    string    `db:"video_id"`
    Author     string    `db:"author"`
    Text       string    `db:"text"`
    Likes      int64     `db:"likes"`
    Rank       int       `db:"rank"`
    AnalyzedAt time.Time `db:"analyzed_at"`
}

type User struct {
	ID         int64     `json:"id"`
	Email      string    `json:"email"`
	Name       string    `json:"name"`
	PictureURL string    `json:"picture_url"`
	ProviderID string    `json:"provider_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type Subscription struct {
	UserID    int64        `json:"user_id"`
	PlanType  string       `json:"plan_type"`
	StartDate sql.NullTime `json:"start_date"`
	EndDate   sql.NullTime `json:"end_date"`
}

type AnalysisHistory struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	VideoID      string    `json:"video_id"`
	VideoTitle   string    `json:"video_title"`
	ThumbnailURL string    `json:"thumbnail_url"`
	CreatedAt    time.Time `json:"created_at"`
}

// Job statuses
const (
    StatusPending    = "pending"
    StatusProcessing = "processing"
    StatusCompleted  = "completed"
    StatusFailed     = "failed"
    StatusCancelled  = "cancelled"
)