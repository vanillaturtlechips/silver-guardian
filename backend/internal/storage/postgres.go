package storage

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "time"

    "github.com/google/uuid"
    _ "github.com/lib/pq"
)

type PostgresStore struct {
    db *sql.DB
}

func NewPostgresStore(dsn string, maxConn, maxIdle int) (*PostgresStore, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    db.SetMaxOpenConns(maxConn)
    db.SetMaxIdleConns(maxIdle)
    db.SetConnMaxLifetime(5 * time.Minute)

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) Close() error {
    return s.db.Close()
}

// CreateVideo inserts or updates a video
func (s *PostgresStore) CreateVideo(v *Video) error {
    query := `
        INSERT INTO videos (video_id, title, description, channel, duration, view_count, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (video_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
    `
    _, err := s.db.Exec(query, v.VideoID, v.Title, v.Description, v.Channel, v.Duration, v.ViewCount, v.PublishedAt)
    return err
}

// CreateJob creates a new analysis job
func (s *PostgresStore) CreateJob(videoID string) (*AnalysisJob, error) {
    job := &AnalysisJob{
        JobID:   uuid.New(),
        VideoID: videoID,
        Status:  StatusPending,
    }

    query := `
        INSERT INTO analysis_jobs (job_id, video_id, status)
        VALUES ($1, $2, $3)
        RETURNING created_at
    `
    err := s.db.QueryRow(query, job.JobID, job.VideoID, job.Status).Scan(&job.CreatedAt)
    if err != nil {
        return nil, err
    }

    return job, nil
}

func (s *PostgresStore) UpdateJobStatus(jobID uuid.UUID, status string, progress int) error {
    // First update status and progress
    query := `UPDATE analysis_jobs SET status = $1, progress = $2 WHERE job_id = $3`
    _, err := s.db.Exec(query, status, progress, jobID)
    if err != nil {
        return err
    }

    // Update started_at if transitioning to processing
    if status == StatusProcessing {
        query = `UPDATE analysis_jobs SET started_at = CURRENT_TIMESTAMP WHERE job_id = $1 AND started_at IS NULL`
        if _, err := s.db.Exec(query, jobID); err != nil {
            return err
        }
    }

    // Update completed_at if job is done
    if status == StatusCompleted || status == StatusFailed || status == StatusCancelled {
        query = `UPDATE analysis_jobs SET completed_at = CURRENT_TIMESTAMP WHERE job_id = $1`
        if _, err := s.db.Exec(query, jobID); err != nil {
            return err
        }
    }

    return nil
}

// UpdateJobError updates job error message
func (s *PostgresStore) UpdateJobError(jobID uuid.UUID, errMsg string) error {
    query := `UPDATE analysis_jobs SET error_message = $1, status = $2 WHERE job_id = $3`
    _, err := s.db.Exec(query, errMsg, StatusFailed, jobID)
    return err
}

// GetJob retrieves a job by ID
func (s *PostgresStore) GetJob(jobID uuid.UUID) (*AnalysisJob, error) {
    job := &AnalysisJob{}
    query := `SELECT job_id, video_id, status, progress, created_at, started_at, completed_at, error_message FROM analysis_jobs WHERE job_id = $1`
    err := s.db.QueryRow(query, jobID).Scan(
        &job.JobID, &job.VideoID, &job.Status, &job.Progress,
        &job.CreatedAt, &job.StartedAt, &job.CompletedAt, &job.ErrorMessage,
    )
    if err != nil {
        return nil, err
    }
    return job, nil
}

// SaveResult saves analysis result
func (s *PostgresStore) SaveResult(jobID uuid.UUID, safetyScore int, categories []string, geminiResp interface{}) error {
    categoriesJSON, _ := json.Marshal(categories)
    geminiJSON, _ := json.Marshal(geminiResp)

    query := `
        INSERT INTO analysis_results (job_id, safety_score, categories, gemini_response)
        VALUES ($1, $2, $3, $4)
    `
    _, err := s.db.Exec(query, jobID, safetyScore, categoriesJSON, geminiJSON)
    return err
}

// GetResult retrieves analysis result
func (s *PostgresStore) GetResult(jobID uuid.UUID) (*AnalysisResult, error) {
    result := &AnalysisResult{}
    query := `SELECT result_id, job_id, safety_score, categories, gemini_response, created_at FROM analysis_results WHERE job_id = $1`
    err := s.db.QueryRow(query, jobID).Scan(
        &result.ResultID, &result.JobID, &result.SafetyScore,
        &result.Categories, &result.GeminiResponse, &result.CreatedAt,
    )
    if err != nil {
        return nil, err
    }
    return result, nil
}

// SaveCaptions saves video captions
func (s *PostgresStore) SaveCaptions(videoID, language, text string) error {
    query := `INSERT INTO captions (video_id, language, text) VALUES ($1, $2, $3)`
    _, err := s.db.Exec(query, videoID, language, text)
    return err
}

// SaveComments saves top comments
func (s *PostgresStore) SaveComments(videoID string, comments []Comment) error {
    tx, err := s.db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Delete old comments
    if _, err := tx.Exec(`DELETE FROM comments WHERE video_id = $1`, videoID); err != nil {
        return err
    }

    // Insert new comments
    stmt, err := tx.Prepare(`INSERT INTO comments (video_id, author, text, likes, rank) VALUES ($1, $2, $3, $4, $5)`)
    if err != nil {
        return err
    }
    defer stmt.Close()

    for _, c := range comments {
        if _, err := stmt.Exec(videoID, c.Author, c.Text, c.Likes, c.Rank); err != nil {
            return err
        }
    }

    return tx.Commit()
}

// GetComments retrieves top comments
func (s *PostgresStore) GetComments(videoID string, limit int) ([]Comment, error) {
    query := `SELECT author, text, likes, rank FROM comments WHERE video_id = $1 ORDER BY rank LIMIT $2`
    rows, err := s.db.Query(query, videoID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var comments []Comment
    for rows.Next() {
        var c Comment
        c.VideoID = videoID
        if err := rows.Scan(&c.Author, &c.Text, &c.Likes, &c.Rank); err != nil {
            return nil, err
        }
        comments = append(comments, c)
    }

    return comments, rows.Err()
}

// --- User Logic ---

func (s *PostgresStorage) UpsertUser(email, name, picture, providerID string) (*User, error) {
	query := `
		INSERT INTO users (email, name, picture_url, provider_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (email) 
		DO UPDATE SET 
			name = EXCLUDED.name, 
			picture_url = EXCLUDED.picture_url,
			provider_id = EXCLUDED.provider_id
		RETURNING id, email, name, picture_url, provider_id, created_at
	`
	
	user := &User{}
	err := s.db.QueryRow(query, email, name, picture, providerID).Scan(
		&user.ID, &user.Email, &user.Name, &user.PictureURL, &user.ProviderID, &user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// 기본 구독 정보가 없으면 생성 (Free)
	_, err = s.db.Exec(`
		INSERT INTO subscriptions (user_id, plan_type)
		VALUES ($1, 'free')
		ON CONFLICT (user_id) DO NOTHING
	`, user.ID)

	return user, err
}

func (s *PostgresStorage) GetUserByID(id int64) (*User, error) {
	user := &User{}
	err := s.db.QueryRow("SELECT id, email, name, picture_url FROM users WHERE id = $1", id).Scan(
		&user.ID, &user.Email, &user.Name, &user.PictureURL,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// --- Subscription Logic ---

func (s *PostgresStorage) GetSubscription(userID int64) (*Subscription, error) {
	sub := &Subscription{}
	err := s.db.QueryRow("SELECT user_id, plan_type, start_date, end_date FROM subscriptions WHERE user_id = $1", userID).Scan(
		&sub.UserID, &sub.PlanType, &sub.StartDate, &sub.EndDate,
	)
	if err == sql.ErrNoRows {
		// 없으면 Free 리턴
		return &Subscription{UserID: userID, PlanType: "free"}, nil
	}
	return sub, err
}

// --- History Logic ---

func (s *PostgresStorage) AddHistory(userID int64, videoID, title, thumb string) error {
	_, err := s.db.Exec(`
		INSERT INTO analysis_history (user_id, video_id, video_title, thumbnail_url)
		VALUES ($1, $2, $3, $4)
	`, userID, videoID, title, thumb)
	return err
}

func (s *PostgresStorage) GetHistory(userID int64, limit, offset int) ([]*AnalysisHistory, error) {
	rows, err := s.db.Query(`
		SELECT id, video_id, video_title, thumbnail_url, created_at 
		FROM analysis_history 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []*AnalysisHistory
	for rows.Next() {
		h := &AnalysisHistory{UserID: userID}
		if err := rows.Scan(&h.ID, &h.VideoID, &h.VideoTitle, &h.ThumbnailURL, &h.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}