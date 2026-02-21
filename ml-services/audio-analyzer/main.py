from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import boto3
import ffmpeg
import tempfile
import os
import logging
import random
from typing import Optional

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Audio Analyzer Service",
    description="딥페이크 음성 탐지 서비스",
    version="1.0.0"
)

# AWS S3 클라이언트
s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'ap-northeast-2'))


class AnalysisRequest(BaseModel):
    s3_bucket: str = Field(..., description="S3 버킷 이름")
    s3_key: str = Field(..., description="S3 객체 키")
    
    class Config:
        json_schema_extra = {
            "example": {
                "s3_bucket": "silver-guardian-uploads",
                "s3_key": "uploads/user123/video.mp4"
            }
        }


class AnalysisResponse(BaseModel):
    deepfake_probability: float = Field(..., ge=0.0, le=1.0, description="딥페이크 확률 (0.0-1.0)")
    audio_duration: float = Field(..., description="오디오 길이 (초)")
    sample_rate: Optional[int] = Field(None, description="샘플링 레이트")
    status: str = Field(default="success")
    message: Optional[str] = None


def extract_audio_from_s3(bucket: str, key: str) -> tuple[str, dict]:
    """S3에서 비디오를 다운로드하고 오디오를 추출"""
    
    # 임시 파일 생성
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_file:
        video_path = video_file.name
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as audio_file:
        audio_path = audio_file.name
    
    try:
        # S3에서 비디오 다운로드
        logger.info(f"Downloading from S3: s3://{bucket}/{key}")
        s3_client.download_file(bucket, key, video_path)
        
        # ffmpeg로 오디오 추출
        logger.info(f"Extracting audio from {video_path}")
        probe = ffmpeg.probe(video_path)
        audio_info = next((s for s in probe['streams'] if s['codec_type'] == 'audio'), None)
        
        if not audio_info:
            raise ValueError("No audio stream found in video")
        
        # 오디오 추출 (16kHz, mono)
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, acodec='pcm_s16le', ac=1, ar='16000')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        
        # 오디오 메타데이터
        audio_probe = ffmpeg.probe(audio_path)
        duration = float(audio_probe['format']['duration'])
        
        metadata = {
            'duration': duration,
            'sample_rate': 16000,
            'channels': 1
        }
        
        return audio_path, metadata
        
    except Exception as e:
        # 정리
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)
        raise e
    finally:
        # 비디오 파일 정리
        if os.path.exists(video_path):
            os.remove(video_path)


def analyze_audio_deepfake(audio_path: str) -> float:
    """
    오디오 딥페이크 분석 (현재는 더미 모델)
    
    TODO: 실제 딥페이크 탐지 모델로 교체
    - 오픈소스 옵션: Wav2Vec2, HuBERT 기반 분류기
    - 상용 옵션: AWS Transcribe + 음성 특징 분석
    """
    
    # 더미 로직: 파일 크기 기반 랜덤 확률
    file_size = os.path.getsize(audio_path)
    
    # 시뮬레이션: 파일이 클수록 약간 더 높은 확률
    base_prob = random.uniform(0.1, 0.4)
    size_factor = min(file_size / (10 * 1024 * 1024), 0.3)  # 최대 0.3 추가
    
    probability = min(base_prob + size_factor, 1.0)
    
    logger.info(f"Dummy model prediction: {probability:.3f}")
    return probability


@app.get("/")
def root():
    return {
        "service": "Audio Analyzer",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(request: AnalysisRequest):
    """
    S3 비디오에서 오디오를 추출하고 딥페이크 확률을 반환
    """
    audio_path = None
    
    try:
        # 1. S3에서 오디오 추출
        audio_path, metadata = extract_audio_from_s3(request.s3_bucket, request.s3_key)
        
        # 2. 딥페이크 분석
        deepfake_prob = analyze_audio_deepfake(audio_path)
        
        return AnalysisResponse(
            deepfake_probability=round(deepfake_prob, 3),
            audio_duration=round(metadata['duration'], 2),
            sample_rate=metadata['sample_rate'],
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # 정리
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
