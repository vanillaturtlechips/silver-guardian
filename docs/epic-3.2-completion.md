# Epic 3.2: Amazon Transcribe & Bedrock 컨텍스트 분석 람다 개발

## ✅ 완료된 작업 (DoD)

### 1. Python Lambda 함수 생성 (Transcribe Job 시작 및 대기 로직)
- ✅ `lambda/transcribe-bedrock-analyzer/lambda_function.py` 생성
- ✅ Transcribe Job 시작 로직
  - S3 비디오 URI 생성
  - TranscriptionJob 시작 (한국어: ko-KR)
  - Job 완료 대기 (최대 5분, 10초 간격 폴링)
  - Transcript JSON 다운로드 및 파싱
  - Job 정리 (DeleteTranscriptionJob)
- ✅ 타임아웃 및 에러 핸들링

### 2. Bedrock API 연동 및 피싱/스캠 판별 프롬프트 엔지니어링
- ✅ Bedrock Runtime 클라이언트 연동
- ✅ Claude 3 Sonnet 모델 사용
- ✅ 프롬프트 엔지니어링:
  - 딥페이크, 보이스피싱, 금융 사기 탐지
  - 0.0~1.0 확률 범위 지정
  - 판단 근거 요청 (한국어)
  - JSON 형식 강제
- ✅ Temperature 0.3 (일관성 있는 응답)

### 3. Bedrock이 반환한 응답에서 확률 점수 파싱 로직 구현
- ✅ 정규식을 이용한 JSON 추출
- ✅ 확률 값 검증 (0.0~1.0 범위)
- ✅ Fallback 처리 (파싱 실패 시 0.5)
- ✅ 에러 핸들링 및 로깅

## 📁 생성된 파일

```
lambda/transcribe-bedrock-analyzer/
├── lambda_function.py              # Lambda 핸들러
└── requirements.txt                # boto3 의존성

terraform/
├── lambda-transcribe-bedrock.tf    # Lambda 리소스
└── versions.tf                     # 수정: archive provider 추가

terraform/step-functions/
└── analysis-workflow.json          # 수정: Lambda 호출로 변경
```

## 🏗️ Lambda 함수 구조

```python
lambda_handler(event, context)
    │
    ├─> transcribe_video(bucket, key)
    │   ├─> start_transcription_job()
    │   ├─> get_transcription_job() (폴링)
    │   ├─> s3.get_object() (transcript 다운로드)
    │   └─> delete_transcription_job()
    │
    ├─> analyze_with_bedrock(transcript_text)
    │   ├─> 프롬프트 생성
    │   ├─> bedrock.invoke_model()
    │   └─> parse_bedrock_response()
    │
    └─> return {scam_probability, reasoning, status}
```

## 📊 프롬프트 엔지니어링

### 입력 프롬프트
```
다음은 YouTube 영상에서 추출한 음성 텍스트입니다. 이 영상이 다음 중 하나에 해당하는지 분석하세요:

1. 딥페이크 (Deepfake): 유명인의 목소리나 얼굴을 조작한 영상
2. 보이스피싱 (Voice Phishing): 금융기관, 정부기관을 사칭하여 금전을 요구
3. 금융 사기 (Financial Scam): 투자 권유, 대출 사기, 다단계 등

텍스트:
"""
{transcript_text[:2000]}
"""

위 텍스트를 분석하여 다음 JSON 형식으로만 응답하세요:
{
  "scam_probability": 0.0~1.0 사이의 숫자,
  "reasoning": "판단 근거를 한국어로 2-3문장"
}

주의사항:
- scam_probability는 0.0 (안전)부터 1.0 (매우 위험)까지의 숫자입니다
- 정상적인 콘텐츠는 0.0~0.3
- 의심스러운 콘텐츠는 0.4~0.6
- 명백한 사기는 0.7~1.0
- JSON 형식만 반환하고 다른 설명은 하지 마세요
```

### 예상 출력
```json
{
  "scam_probability": 0.156,
  "reasoning": "정상적인 교육 콘텐츠로 보입니다. 금전 요구나 개인정보 수집 시도가 없으며, 유명인 사칭의 징후도 발견되지 않았습니다."
}
```

## 🚀 배포 방법

### Terraform 적용
```bash
cd terraform
terraform init
terraform apply -target=aws_lambda_function.transcribe_bedrock_analyzer
```

### Lambda 함수 확인
```bash
# 함수 리스트
aws lambda list-functions --region ap-northeast-2 | grep transcribe

# 함수 상세 정보
aws lambda get-function \
  --function-name silver-guardian-transcribe-bedrock-analyzer \
  --region ap-northeast-2
```

## 🧪 테스트 방법

### 1. 로컬 테스트 (Python)
```python
import json
from lambda_function import lambda_handler

event = {
    "bucket": "silver-guardian-uploads",
    "key": "uploads/test/video.mp4"
}

result = lambda_handler(event, None)
print(json.dumps(result, indent=2, ensure_ascii=False))
```

### 2. AWS Lambda 콘솔 테스트
```json
{
  "bucket": "silver-guardian-uploads",
  "key": "uploads/test/video.mp4"
}
```

### 3. AWS CLI 테스트
```bash
aws lambda invoke \
  --function-name silver-guardian-transcribe-bedrock-analyzer \
  --payload '{"bucket":"silver-guardian-uploads","key":"uploads/test/video.mp4"}' \
  --region ap-northeast-2 \
  response.json

cat response.json | jq '.'
```

### 4. Step Functions 통합 테스트
```bash
# Step Functions 실행
aws stepfunctions start-execution \
  --state-machine-arn <arn> \
  --input '{
    "detail": {
      "bucket": {"name": "silver-guardian-uploads"},
      "object": {"key": "uploads/test/video.mp4"}
    }
  }' \
  --region ap-northeast-2
```

## 📈 실행 흐름

### 타임라인
```
Time: 0s
├─ Lambda 시작
└─ S3 비디오 URI 생성

Time: 1s
├─ Transcribe Job 시작
└─ Job 상태 폴링 시작

Time: 1s - 300s (최대 5분)
├─ 10초마다 Job 상태 확인
└─ COMPLETED 대기

Time: 30s (평균)
├─ Transcribe 완료
├─ Transcript JSON 다운로드
└─ 텍스트 추출

Time: 31s
├─ Bedrock Claude 3 호출
└─ 프롬프트 전송

Time: 33s
├─ Bedrock 응답 수신
├─ JSON 파싱
└─ 확률 점수 추출

Time: 34s
└─ Lambda 응답 반환

Total: ~34초 (Transcribe 시간에 따라 변동)
```

## 💰 비용 분석

### Transcribe
- **가격**: $0.024 per minute (한국어)
- **평균 영상**: 5분
- **비용**: $0.12 per video

### Bedrock (Claude 3 Sonnet)
- **Input**: ~2000 tokens ($0.003 per 1K tokens)
- **Output**: ~100 tokens ($0.015 per 1K tokens)
- **비용**: ~$0.008 per video

### Lambda
- **실행 시간**: ~34초
- **메모리**: 512MB
- **비용**: ~$0.0001 per video

### Total per Video
- **Transcribe**: $0.12
- **Bedrock**: $0.008
- **Lambda**: $0.0001
- **Total**: ~$0.13 per video

### Monthly Cost (1000 videos)
- **Total**: ~$130/month

## 🔄 에러 핸들링

### Transcribe 실패
```python
if job_status == 'FAILED':
    raise Exception(f"Transcription failed: {failure_reason}")
```
→ Step Functions Retry (2회) → Fallback (0.5)

### Transcribe 타임아웃
```python
if elapsed >= 300:  # 5분
    raise Exception("Transcription timeout")
```
→ Step Functions Retry (2회) → Fallback (0.5)

### Bedrock 파싱 실패
```python
except Exception as e:
    return {
        'scam_probability': 0.5,
        'reasoning': '응답 파싱 실패'
    }
```
→ 중립값 반환

### 텍스트 너무 짧음
```python
if len(transcript_text) < 10:
    return {
        'scam_probability': 0.3,
        'reasoning': '텍스트가 너무 짧아 분석이 어렵습니다.'
    }
```
→ 낮은 위험도 반환

## 🔐 보안 고려사항

### IAM 권한
- ✅ Transcribe: StartJob, GetJob, DeleteJob
- ✅ Bedrock: InvokeModel (특정 모델만)
- ✅ S3: GetObject, PutObject (특정 버킷만)
- ✅ CloudWatch Logs: 쓰기 권한

### 데이터 보호
- ✅ Transcript는 S3에 임시 저장 후 삭제
- ✅ Lambda 환경변수 암호화
- ⚠️ TODO: VPC 내부 실행
- ⚠️ TODO: S3 버킷 암호화 강제

### 비용 제한
- ✅ Lambda 타임아웃: 10분
- ✅ Transcribe 대기: 최대 5분
- ✅ 텍스트 길이 제한: 2000자 (Bedrock 입력)

## 📊 모니터링

### CloudWatch Logs
```bash
# 실시간 로그
aws logs tail /aws/lambda/silver-guardian-transcribe-bedrock-analyzer --follow

# 에러 로그 필터
aws logs filter-log-events \
  --log-group-name /aws/lambda/silver-guardian-transcribe-bedrock-analyzer \
  --filter-pattern "ERROR" \
  --region ap-northeast-2
```

### CloudWatch Metrics
```bash
# 실행 횟수
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=silver-guardian-transcribe-bedrock-analyzer \
  --start-time 2026-02-21T00:00:00Z \
  --end-time 2026-02-21T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 🎉 완료!

Epic 3.2의 모든 DoD가 충족되었습니다. Transcribe & Bedrock Lambda 함수가 개발되었으며, Step Functions에서 호출 가능합니다!

## 📝 검증 체크리스트

- [x] Python Lambda 함수 작성
- [x] Transcribe Job 시작 로직
- [x] Transcribe Job 완료 대기 (폴링)
- [x] Transcript 다운로드 및 파싱
- [x] Bedrock API 연동
- [x] 프롬프트 엔지니어링
- [x] JSON 응답 파싱
- [x] 확률 점수 검증 (0.0~1.0)
- [x] 에러 핸들링 및 Fallback
- [x] Terraform 리소스 정의
- [x] IAM Role 및 Policy 설정
- [x] Terraform 검증 통과
- [ ] 실제 배포 및 테스트 (사용자 실행 필요)

## 🔄 다음 단계 (Epic 3.3)

**DB 상태 업데이트 처리 로직 구현**
- SaveToDatabase Lambda 함수 개발
- PostgreSQL 연결 및 업데이트
- 프론트엔드 폴링 API
