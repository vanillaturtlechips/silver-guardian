# ML Services

Silver Guardian의 머신러닝 분석 마이크로서비스 모음

## 서비스 목록

### 1. Audio Analyzer (✅ 완료)
**딥페이크 음성 탐지**

- **경로**: `audio-analyzer/`
- **기술**: FastAPI, ffmpeg, boto3
- **기능**: S3 비디오에서 오디오 추출 및 딥페이크 확률 분석
- **포트**: 8000
- **문서**: [README](./audio-analyzer/README.md)

### 2. Video Analyzer (✅ 완료)
**프레임 조작 탐지**

- **경로**: `video-analyzer/`
- **기술**: FastAPI, OpenCV, boto3
- **기능**: 비디오 프레임 일관성 분석 및 조작 탐지
- **포트**: 8001
- **문서**: [README](./video-analyzer/README.md)

## 아키텍처

```
┌──────────────────┐
│  EventBridge     │
│  (S3 Upload)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Step Functions   │
│ (Orchestrator)   │
└────┬────────┬────┘
     │        │
     │        └──────────────┐
     ▼                       ▼
┌─────────────┐      ┌─────────────┐
│   Audio     │      │   Video     │
│  Analyzer   │      │  Analyzer   │
│  (Port 8000)│      │  (Port 8001)│
└─────────────┘      └─────────────┘
     │                       │
     └───────────┬───────────┘
                 ▼
         ┌──────────────┐
         │ Meta Learner │
         │   (Lambda)   │
         └──────────────┘
```

## 로컬 개발

### 사전 준비
```bash
# Python 3.11 설치
python --version

# Docker 설치
docker --version

# AWS 자격 증명 설정
export AWS_REGION=ap-northeast-2
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### Video Analyzer 실행
```bash
cd video-analyzer

# 방법 1: Python 직접 실행
pip install -r requirements.txt
python main.py

# 방법 2: Docker 실행
docker build -t video-analyzer:latest .
docker run -p 8001:8001 \
  -e AWS_REGION=$AWS_REGION \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  video-analyzer:latest

# 테스트
./test-local.sh
```

### 두 서비스 동시 실행
```bash
# Audio Analyzer (포트 8000)
cd audio-analyzer
docker run -d -p 8000:8000 \
  -e AWS_REGION=$AWS_REGION \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  --name audio-analyzer \
  audio-analyzer:latest

# Video Analyzer (포트 8001)
cd ../video-analyzer
docker run -d -p 8001:8001 \
  -e AWS_REGION=$AWS_REGION \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  --name video-analyzer \
  video-analyzer:latest

# 상태 확인
docker ps
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## EKS 배포

### 1. ECR에 이미지 푸시
```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 태그 및 푸시
docker tag audio-analyzer:latest \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest

docker push 009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest
```

### 2. Kubernetes 배포
```bash
kubectl apply -f k8s/audio-analyzer-deployment.yaml
kubectl apply -f k8s/audio-analyzer-service.yaml
```

### 3. KEDA ScaledObject 적용
```bash
kubectl apply -f k8s/audio-analyzer-scaledobject.yaml
```

## API 테스트

### Audio Analyzer
```bash
# 헬스체크
curl http://localhost:8000/health

# 분석 요청
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "s3_bucket": "silver-guardian-uploads",
    "s3_key": "uploads/test/video.mp4"
  }'

# Swagger UI
open http://localhost:8000/docs
```

### Video Analyzer
```bash
# 헬스체크
curl http://localhost:8001/health

# 분석 요청
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "s3_bucket": "silver-guardian-uploads",
    "s3_key": "uploads/test/video.mp4",
    "sample_rate": 30
  }'

# Swagger UI
open http://localhost:8001/docs
```

## 개발 가이드

### 새 서비스 추가
1. 디렉토리 생성: `mkdir new-service`
2. FastAPI 보일러플레이트 복사
3. `requirements.txt` 작성
4. `main.py` 구현
5. `Dockerfile` 작성
6. `README.md` 문서화
7. 테스트 스크립트 작성

### 코드 스타일
- **Formatter**: Black
- **Linter**: Ruff
- **Type Checker**: mypy
- **Docstring**: Google Style

### 테스트
```bash
# 단위 테스트
pytest tests/

# 커버리지
pytest --cov=. tests/

# 통합 테스트
./test-local.sh
```

## 모니터링

### 로그 확인
```bash
# Docker 로그
docker logs -f audio-analyzer-test

# Kubernetes 로그
kubectl logs -f deployment/audio-analyzer

# CloudWatch Logs (EKS)
aws logs tail /aws/eks/silver-guardian/audio-analyzer --follow
```

### 메트릭
- **요청 수**: Prometheus `/metrics` 엔드포인트
- **응답 시간**: FastAPI 미들웨어
- **에러율**: CloudWatch Alarms

## 문제 해결

### ffmpeg 오류
```bash
# ffmpeg 설치 확인
ffmpeg -version

# Docker 이미지 재빌드
docker build --no-cache -t audio-analyzer:latest .
```

### S3 권한 오류
```bash
# IAM 정책 확인
aws iam get-user-policy --user-name your-user --policy-name S3Access

# 버킷 권한 확인
aws s3api get-bucket-policy --bucket silver-guardian-uploads
```

### 메모리 부족
```bash
# Docker 메모리 제한 증가
docker run -m 2g audio-analyzer:latest

# Kubernetes 리소스 제한 조정
kubectl edit deployment audio-analyzer
```

## 성능 최적화

### 추론 속도
- **GPU 사용**: CUDA 지원 이미지 사용
- **모델 양자화**: ONNX INT8 변환
- **배치 처리**: 여러 파일 동시 분석

### 메모리 사용
- **스트리밍 처리**: 대용량 파일 청크 단위 처리
- **캐싱**: Redis를 이용한 결과 캐싱
- **가비지 컬렉션**: 임시 파일 즉시 삭제

## 보안

### 자격 증명 관리
- ✅ 환경변수로 주입 (로컬)
- ✅ EKS IRSA (프로덕션)
- ❌ 코드에 하드코딩 금지

### 입력 검증
- 파일 크기 제한 (최대 500MB)
- 파일 형식 검증 (video/*)
- S3 경로 검증 (uploads/ 프리픽스만)

## 라이선스

MIT License - Silver Guardian Project
