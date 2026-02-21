-- Analysis Results 테이블 생성
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(255) UNIQUE NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    audio_score DECIMAL(5,3) DEFAULT 0.5,
    video_score DECIMAL(5,3) DEFAULT 0.5,
    context_score DECIMAL(5,3) DEFAULT 0.5,
    final_score INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_analysis_results_video_id ON analysis_results(video_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_status ON analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);

-- 코멘트
COMMENT ON TABLE analysis_results IS 'ML 분석 결과 저장';
COMMENT ON COLUMN analysis_results.audio_score IS '오디오 딥페이크 확률 (0.0-1.0)';
COMMENT ON COLUMN analysis_results.video_score IS '비디오 조작 확률 (0.0-1.0)';
COMMENT ON COLUMN analysis_results.context_score IS '컨텍스트 사기 확률 (0.0-1.0)';
COMMENT ON COLUMN analysis_results.final_score IS '최종 위험도 점수 (0-100)';
