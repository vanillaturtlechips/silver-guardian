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

CREATE INDEX idx_comments_video ON comments(video_id);
CREATE INDEX idx_comments_rank ON comments(video_id, rank);