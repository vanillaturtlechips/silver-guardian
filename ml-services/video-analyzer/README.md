# Video Analyzer Service

비디오 프레임 조작 탐지를 위한 FastAPI 마이크로서비스

## 기능

- S3에서 비디오 다운로드
- OpenCV를 이용한 프레임 추출 및 샘플링
- 시공간 프레임 일관성 분석
- 조작 확률 반환 (0.0-1.0)

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
uvicorn main:app --reload --port 8001
```

## Docker 실행

### 빌드
```bash
docker build -t video-analyzer:latest .
```

### 실행
```bash
docker run -p 8001:8001 \
  -e AWS_REGION=ap-northeast-2 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  video-analyzer:latest
```

## API 사용법

### 헬스체크
```bash
curl http://localhost:8001/health
```

### 분석 요청
```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "s3_bucket": "silver-guardian-uploads",
    "s3_key": "uploads/user123/video.mp4",
    "sample_rate": 30
  }'
```

### 응답 예시
```json
{
  "manipulation_probability": 0.345,
  "total_frames": 1800,
  "analyzed_frames": 60,
  "video_duration": 60.0,
  "fps": 30.0,
  "resolution": "1920x1080",
  "suspicious_frames": [
    {
      "frame_number": 450,
      "inconsistency_score": 0.823
    },
    {
      "frame_number": 900,
      "inconsistency_score": 0.756
    }
  ],
  "status": "success",
  "message": null
}
```

## API 문서

서버 실행 후 다음 URL에서 자동 생성된 문서 확인:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## 아키텍처

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /analyze
       ▼
┌─────────────────────┐
│  FastAPI Server     │
│  (Port 8001)        │
└──────┬──────────────┘
       │
       │ 1. Download
       ▼
┌─────────────────────┐
│   AWS S3            │
│   (Video File)      │
└─────────────────────┘
       │
       │ 2. Extract Frames
       ▼
┌─────────────────────┐
│   OpenCV            │
│   (Frame Sampling)  │
└──────┬──────────────┘
       │
       │ 3. Analyze Consistency
       ▼
┌─────────────────────┐
│  Deepfake Model     │
│  (Spatial-Temporal) │
└──────┬──────────────┘
       │
       │ 4. Return Probability
       ▼
┌─────────────────────┐
│   Response          │
│   {prob: 0.345}     │
└─────────────────────┘
```

## 프레임 샘플링

비디오 전체를 분석하면 시간이 오래 걸리므로 샘플링을 사용합니다:

- `sample_rate=30`: 30프레임마다 1개 추출 (1초에 1프레임, 30fps 기준)
- `sample_rate=15`: 15프레임마다 1개 추출 (1초에 2프레임)
- `sample_rate=1`: 모든 프레임 분석 (느림, 정확함)

**권장값**: 30 (빠르고 충분히 정확)

## TODO: 실제 모델 통합

현재는 더미 모델을 사용합니다. 실제 딥페이크 탐지 모델로 교체 필요:

### 오픈소스 옵션

#### 1. FakeSTormer (Spatial-Temporal Transformer)
```python
import torch
from transformers import VideoMAEForVideoClassification

model = VideoMAEForVideoClassification.from_pretrained("model-checkpoint")

def analyze_frame_consistency(frames: List[np.ndarray]) -> float:
    # 프레임을 텐서로 변환
    video_tensor = torch.stack([torch.from_numpy(f) for f in frames])
    video_tensor = video_tensor.permute(0, 3, 1, 2)  # (T, H, W, C) -> (T, C, H, W)
    
    # 모델 추론
    with torch.no_grad():
        outputs = model(video_tensor.unsqueeze(0))
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        manipulation_prob = probs[0][1].item()  # Class 1 = Manipulated
    
    return manipulation_prob
```

#### 2. EfficientNet + LSTM
```python
import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0

class VideoDeepfakeDetector(nn.Module):
    def __init__(self):
        super().__init__()
        self.cnn = efficientnet_b0(pretrained=True)
        self.cnn.classifier = nn.Identity()  # 특징 추출만
        self.lstm = nn.LSTM(1280, 512, batch_first=True)
        self.fc = nn.Linear(512, 2)
    
    def forward(self, frames):
        # frames: (batch, seq_len, C, H, W)
        batch_size, seq_len = frames.shape[:2]
        
        # CNN으로 각 프레임 특징 추출
        features = []
        for i in range(seq_len):
            feat = self.cnn(frames[:, i])
            features.append(feat)
        features = torch.stack(features, dim=1)
        
        # LSTM으로 시간적 패턴 분석
        lstm_out, _ = self.lstm(features)
        
        # 마지막 출력으로 분류
        logits = self.fc(lstm_out[:, -1])
        return logits
```

#### 3. Face X-ray (얼굴 경계 불일치 탐지)
```python
import dlib
from PIL import Image

detector = dlib.get_frontal_face_detector()

def detect_face_boundary_artifacts(frame: np.ndarray) -> float:
    """얼굴 경계에서 블렌딩 아티팩트 탐지"""
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    faces = detector(gray)
    
    if len(faces) == 0:
        return 0.0
    
    # 얼굴 경계 영역 추출
    for face in faces:
        x, y, w, h = face.left(), face.top(), face.width(), face.height()
        
        # 경계 영역 (얼굴 주변 10px)
        boundary = frame[max(0, y-10):y+h+10, max(0, x-10):x+w+10]
        
        # 주파수 분석으로 블렌딩 탐지
        # (실제 구현 필요)
        artifact_score = analyze_frequency_artifacts(boundary)
        
        return artifact_score
    
    return 0.0
```

### 모델 선택 가이드

| 모델 | 정확도 | 속도 | 메모리 | 용도 |
|------|--------|------|--------|------|
| FakeSTormer | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 전체 비디오 분석 |
| EfficientNet+LSTM | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 실시간 분석 |
| Face X-ray | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 얼굴 중심 영상 |

## 성능 최적화

### 프레임 샘플링
- **고속 분석**: `sample_rate=60` (2초에 1프레임)
- **균형**: `sample_rate=30` (1초에 1프레임)
- **정밀 분석**: `sample_rate=10` (1초에 3프레임)

### GPU 가속
```python
# CUDA 사용 시
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
```

### 배치 처리
```python
# 여러 프레임을 한 번에 처리
batch_size = 32
for i in range(0, len(frames), batch_size):
    batch = frames[i:i+batch_size]
    predictions = model(batch)
```

## 문제 해결

### OpenCV 오류
```bash
# 시스템 라이브러리 확인
apt-get install libgl1-mesa-glx libglib2.0-0

# Docker 이미지 재빌드
docker build --no-cache -t video-analyzer:latest .
```

### 메모리 부족
```bash
# 샘플링 레이트 증가 (프레임 수 감소)
"sample_rate": 60

# Docker 메모리 제한 증가
docker run -m 4g video-analyzer:latest
```

### 느린 처리 속도
- GPU 사용 (CUDA)
- 샘플링 레이트 증가
- 해상도 다운스케일 (720p → 480p)

## 보안

- ✅ AWS 자격 증명은 환경변수로 주입
- ✅ 임시 파일 자동 정리
- ✅ 에러 핸들링 및 로깅
- ⚠️ TODO: 파일 크기 제한 (최대 500MB)
- ⚠️ TODO: 타임아웃 설정 (최대 5분)

## 라이선스

MIT License - Silver Guardian Project
