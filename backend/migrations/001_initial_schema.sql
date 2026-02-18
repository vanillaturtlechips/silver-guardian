-- 1. 기존 테이블 (Videos)
CREATE TABLE IF NOT EXISTS videos (
    video_id VARCHAR(20) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    channel VARCHAR(255),
    duration BIGINT,
    view_count BIGINT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Analysis jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    job_id UUID PRIMARY KEY,
    video_id VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON analysis_jobs(created_at DESC);

-- 3. Analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
    result_id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES analysis_jobs(job_id) ON DELETE CASCADE,
    safety_score INT NOT NULL,
    categories JSONB,
    gemini_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_results_job ON analysis_results(job_id);

-- 4. Captions
CREATE TABLE IF NOT EXISTS captions (
    caption_id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,
    language VARCHAR(10),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_captions_video ON captions(video_id);

-- 5. Comments
CREATE TABLE IF NOT EXISTS comments (
    comment_id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,
    author VARCHAR(255),
    text TEXT NOT NULL,
    likes BIGINT DEFAULT 0,
    rank INT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_rank ON comments(video_id, rank);

-- [NEW] 6. 사용자 테이블 (구글 로그인 전용)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    picture_url TEXT,
    provider_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [NEW] 7. 구독 정보 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INT REFERENCES users(id),
    plan_type VARCHAR(20) DEFAULT 'free',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- [NEW] 8. 분석 이력 테이블
CREATE TABLE IF NOT EXISTS analysis_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    video_id VARCHAR(50) NOT NULL,
    video_title TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);