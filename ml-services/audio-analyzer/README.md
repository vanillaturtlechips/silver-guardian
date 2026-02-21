# Audio Analyzer Service

딥페이크 음성 탐지를 위한 FastAPI 마이크로서비스

## 기능

- S3에서 비디오 다운로드
- ffmpeg를 이용한 오디오 추출
- 딥페이크 음성 확률 분석 (0.0-1.0)

## 로컬 실행

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 환경변수 설정
```bash
export AWS_REGION=ap-northeast-2
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. 서버 실행
```bash
python main.py
```

또는:
```bash
uvicorn main:app --reload
```

## Docker 실행

### 빌드
```bash
docker build -t audio-analyzer:latest .
```

### 실행
```bash
docker run -p 8000:8000 \
  -e AWS_REGION=ap-northeast-2 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  audio-analyzer:latest
```

## API 사용법

### 헬스체크
```bash
curl http://localhost:8000/health
```

### 분석 요청
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "s3_bucket": "silver-guardian-uploads",
    "s3_key": "uploads/user123/video.mp4"
  }'
```

### 응답 예시
```json
{
  "deepfake_probability": 0.234,
  "audio_duration": 45.67,
  "sample_rate": 16000,
  "status": "success",
  "message": null
}
```

## API 문서

서버 실행 후 다음 URL에서 자동 생성된 문서 확인:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 아키텍처

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /analyze
       ▼
┌─────────────────────┐
│  FastAPI Server     │
│  (Port 8000)        │
└──────┬──────────────┘
       │
       │ 1. Download
       ▼
┌─────────────────────┐
│   AWS S3            │
│   (Video File)      │
└─────────────────────┘
       │
       │ 2. Extract Audio
       ▼
┌─────────────────────┐
│   ffmpeg            │
│   (Audio WAV)       │
└──────┬──────────────┘
       │
       │ 3. Analyze
       ▼
┌─────────────────────┐
│  Deepfake Model     │
│  (Dummy/Real)       │
└──────┬──────────────┘
       │
       │ 4. Return Probability
       ▼
┌─────────────────────┐
│   Response          │
│   {prob: 0.234}     │
└─────────────────────┘
```

## TODO: 실제 모델 통합

현재는 더미 모델을 사용합니다. 실제 딥페이크 탐지 모델로 교체 필요:

### 오픈소스 옵션
1. **Wav2Vec2 기반 분류기**
   - Hugging Face Transformers
   - 사전 학습된 음성 인식 모델 활용

2. **HuBERT 기반 탐지**
   - Facebook의 음성 표현 학습 모델
   - Fine-tuning으로 딥페이크 탐지

3. **RawNet2**
   - End-to-end 딥페이크 음성 탐지
   - 경량화된 CNN 아키텍처

### 구현 예시 (Wav2Vec2)
```python
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Processor
import torch
import torchaudio

processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
model = Wav2Vec2ForSequenceClassification.from_pretrained("model-checkpoint")

def analyze_audio_deepfake(audio_path: str) -> float:
    waveform, sample_rate = torchaudio.load(audio_path)
    inputs = processor(waveform.squeeze(), sampling_rate=sample_rate, return_tensors="pt")
    
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)
        deepfake_prob = probs[0][1].item()  # Class 1 = Deepfake
    
    return deepfake_prob
```

## 성능 최적화

- **배치 처리**: 여러 파일 동시 분석
- **GPU 지원**: CUDA 활성화 시 추론 속도 향상
- **캐싱**: 동일 파일 재분석 방지
- **비동기 처리**: 대용량 파일 처리 시 타임아웃 방지
