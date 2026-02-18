-- Videos table
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

-- Analysis jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    job_id UUID PRIMARY KEY,
    video_id VARCHAR(20),  -- 외래 키 제약 조건 제거
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX idx_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_jobs_created ON analysis_jobs(created_at DESC);

-- Analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
    result_id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES analysis_jobs(job_id) ON DELETE CASCADE,
    safety_score INT NOT NULL,
    categories JSONB,
    gemini_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_job ON analysis_results(job_id);

-- Captions
CREATE TABLE IF NOT EXISTS captions (
    caption_id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,
    language VARCHAR(10),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_captions_video ON captions(video_id);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    comment_id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,
    author VARCHAR(255),
    text TEXT NOT NULL,
    likes BIGINT DEFAULT 0,
    rank INT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. 사용자 테이블 (구글 로그인 전용)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    picture_url TEXT, -- 프로필 이미지
    provider_id VARCHAR(255), -- 구글 고유 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 구독 정보 테이블 (심플 버전)
CREATE TABLE subscriptions (
    user_id INT REFERENCES users(id),
    plan_type VARCHAR(20) DEFAULT 'free', -- 'free', 'pro'
    start_date TIMESTAMP,
    end_date TIMESTAMP, -- NULL이면 무제한 or 만료 없음
    PRIMARY KEY (user_id)
);

-- 3. 분석 이력 테이블 (유저와 연결)
CREATE TABLE analysis_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    video_id VARCHAR(50) NOT NULL,
    video_title TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- 분석 결과 JSON은 용량이 크므로 필요하다면 별도 저장하거나, 다시 요청하도록 설계
);


CREATE INDEX idx_comments_video ON comments(video_id);
CREATE INDEX idx_comments_rank ON comments(video_id, rank);