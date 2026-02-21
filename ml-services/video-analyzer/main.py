from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import boto3
import cv2
import tempfile
import os
import logging
import random
import numpy as np
from typing import Optional, List

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Video Analyzer Service",
    description="비디오 프레임 조작 탐지 서비스",
    version="1.0.0"
)

# AWS S3 클라이언트
s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'ap-northeast-2'))


class AnalysisRequest(BaseModel):
    s3_bucket: str = Field(..., description="S3 버킷 이름")
    s3_key: str = Field(..., description="S3 객체 키")
    sample_rate: int = Field(default=30, description="프레임 샘플링 레이트 (N프레임마다 1개)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "s3_bucket": "silver-guardian-uploads",
                "s3_key": "uploads/user123/video.mp4",
                "sample_rate": 30
            }
        }


class FrameAnalysis(BaseModel):
    frame_number: int
    inconsistency_score: float = Field(..., ge=0.0, le=1.0)


class AnalysisResponse(BaseModel):
    manipulation_probability: float = Field(..., ge=0.0, le=1.0, description="조작 확률 (0.0-1.0)")
    total_frames: int = Field(..., description="전체 프레임 수")
    analyzed_frames: int = Field(..., description="분석된 프레임 수")
    video_duration: float = Field(..., description="비디오 길이 (초)")
    fps: float = Field(..., description="초당 프레임 수")
    resolution: str = Field(..., description="해상도 (WxH)")
    suspicious_frames: Optional[List[FrameAnalysis]] = None
    status: str = Field(default="success")
    message: Optional[str] = None


def download_video_from_s3(bucket: str, key: str) -> str:
    """S3에서 비디오 다운로드"""
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_file:
        video_path = video_file.name
    
    try:
        logger.info(f"Downloading from S3: s3://{bucket}/{key}")
        s3_client.download_file(bucket, key, video_path)
        return video_path
    except Exception as e:
        if os.path.exists(video_path):
            os.remove(video_path)
        raise e


def extract_frames(video_path: str, sample_rate: int = 30) -> tuple[List[np.ndarray], dict]:
    """비디오에서 프레임 추출"""
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise ValueError("Failed to open video file")
    
    # 비디오 메타데이터
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    
    metadata = {
        'total_frames': total_frames,
        'fps': fps,
        'width': width,
        'height': height,
        'duration': duration,
        'resolution': f"{width}x{height}"
    }
    
    # 프레임 샘플링
    frames = []
    frame_count = 0
    
    logger.info(f"Extracting frames (sample_rate={sample_rate})")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % sample_rate == 0:
            # RGB로 변환 (OpenCV는 BGR)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame_rgb)
        
        frame_count += 1
    
    cap.release()
    logger.info(f"Extracted {len(frames)} frames from {total_frames} total frames")
    
    return frames, metadata


def analyze_frame_consistency(frames: List[np.ndarray]) -> tuple[float, List[FrameAnalysis]]:
    """
    프레임 일관성 분석 (현재는 더미 모델)
    
    TODO: 실제 딥페이크 탐지 모델로 교체
    - FakeSTormer: Spatial-Temporal Transformer
    - EfficientNet + LSTM: 프레임 시퀀스 분석
    - Face X-ray: 얼굴 경계 불일치 탐지
    """
    
    if len(frames) == 0:
        return 0.0, []
    
    suspicious_frames = []
    inconsistency_scores = []
    
    for idx, frame in enumerate(frames):
        # 더미 로직: 프레임 밝기 변화 기반 랜덤 점수
        brightness = np.mean(frame)
        
        # 시뮬레이션: 밝기가 극단적이면 의심스러움
        if brightness < 50 or brightness > 200:
            score = random.uniform(0.6, 0.9)
        else:
            score = random.uniform(0.1, 0.4)
        
        inconsistency_scores.append(score)
        
        # 의심스러운 프레임 (점수 > 0.7)
        if score > 0.7:
            suspicious_frames.append(FrameAnalysis(
                frame_number=idx * 30,  # 실제 프레임 번호 (sample_rate 고려)
                inconsistency_score=round(score, 3)
            ))
    
    # 전체 조작 확률: 평균 점수
    manipulation_prob = np.mean(inconsistency_scores)
    
    logger.info(f"Analysis complete: {manipulation_prob:.3f} manipulation probability")
    logger.info(f"Found {len(suspicious_frames)} suspicious frames")
    
    return manipulation_prob, suspicious_frames


@app.get("/")
def root():
    return {
        "service": "Video Analyzer",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_video(request: AnalysisRequest):
    """
    S3 비디오의 프레임을 분석하고 조작 확률을 반환
    """
    video_path = None
    
    try:
        # 1. S3에서 비디오 다운로드
        video_path = download_video_from_s3(request.s3_bucket, request.s3_key)
        
        # 2. 프레임 추출
        frames, metadata = extract_frames(video_path, request.sample_rate)
        
        # 3. 프레임 일관성 분석
        manipulation_prob, suspicious_frames = analyze_frame_consistency(frames)
        
        return AnalysisResponse(
            manipulation_probability=round(manipulation_prob, 3),
            total_frames=metadata['total_frames'],
            analyzed_frames=len(frames),
            video_duration=round(metadata['duration'], 2),
            fps=round(metadata['fps'], 2),
            resolution=metadata['resolution'],
            suspicious_frames=suspicious_frames[:10],  # 최대 10개만 반환
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # 정리
        if video_path and os.path.exists(video_path):
            os.remove(video_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
