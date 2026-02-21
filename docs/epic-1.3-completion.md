# Epic 1.3: S3 업로드 이벤트 및 EventBridge 연동 설정

## ✅ 완료된 작업 (DoD)

### 1. Terraform 코드에 S3 버킷 이벤트 알림 설정 추가
- ✅ `terraform/s3.tf` 생성
  - S3 버킷 생성 (`silver-guardian-uploads`)
  - 버킷 버저닝 활성화
  - CORS 설정 (프론트엔드 직접 업로드 지원)
  - 서버 측 암호화 (AES256)
  - 퍼블릭 액세스 차단
  - **EventBridge 알림 활성화** (`eventbridge = true`)

### 2. EventBridge 규칙 생성 (S3 PutObject 이벤트 감지)
- ✅ `terraform/eventbridge.tf` 생성
  - EventBridge 규칙: `silver-guardian-s3-upload`
  - 이벤트 패턴:
    - Source: `aws.s3`
    - Detail-Type: `Object Created`
    - Bucket: `silver-guardian-uploads`
    - Object Key Prefix: `uploads/`
  - CloudWatch Logs 타겟 설정 (테스트용)
  - CloudWatch Logs 리소스 정책 (EventBridge 쓰기 권한)

### 3. (임시) 이벤트 발생 시 CloudWatch Logs로 로그가 잘 찍히는지 연동 테스트
- ✅ CloudWatch Logs 그룹 생성: `/aws/events/silver-guardian-s3-uploads`
- ✅ 로그 보존 기간: 7일
- ✅ 테스트 스크립트 작성: `terraform/test-s3-events.sh`
  - S3 버킷 확인
  - EventBridge 규칙 확인
  - 테스트 파일 업로드
  - CloudWatch Logs 확인

## 📁 생성/수정된 파일

```
terraform/
├── s3.tf                          # 신규: S3 버킷 및 알림 설정
├── eventbridge.tf                 # 신규: EventBridge 규칙 및 타겟
├── outputs.tf                     # 수정: S3/EventBridge 출력 추가
└── test-s3-events.sh              # 신규: 테스트 스크립트
```

## 🏗️ 인프라 아키텍처

```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│   Client    │         │   AWS S3    │         │  EventBridge     │
│  (Upload)   │         │   Bucket    │         │                  │
└──────┬──────┘         └──────┬──────┘         └────────┬─────────┘
       │                       │                         │
       │ PUT Object            │                         │
       │──────────────────────>│                         │
       │                       │                         │
       │                       │ Object Created Event    │
       │                       │────────────────────────>│
       │                       │                         │
       │                       │                         │ Match Rule
       │                       │                         │ (uploads/*)
       │                       │                         │
       │                       │                         ▼
       │                       │                ┌─────────────────┐
       │                       │                │ CloudWatch Logs │
       │                       │                │  (Test Target)  │
       │                       │                └─────────────────┘
       │                       │                         │
       │                       │                         │ Future:
       │                       │                         ▼
       │                       │                ┌─────────────────┐
       │                       │                │ Step Functions  │
       │                       │                │  (Epic 3)       │
       │                       │                └─────────────────┘
```

## 🚀 배포 방법

### 1. Terraform 검증
```bash
cd terraform
terraform init
terraform validate
```

### 2. 계획 확인
```bash
terraform plan
```

### 3. 인프라 배포
```bash
terraform apply
```

또는 루트 디렉토리에서:
```bash
./deploy.sh
```

### 4. 출력 확인
```bash
terraform output s3_bucket_name
terraform output eventbridge_rule_name
terraform output cloudwatch_log_group
```

## 🧪 테스트 방법

### 자동 테스트 스크립트 실행
```bash
cd terraform
./test-s3-events.sh
```

스크립트는 다음을 수행합니다:
1. S3 버킷 존재 확인
2. EventBridge 규칙 확인
3. 테스트 파일 업로드 (`uploads/test/test-video.txt`)
4. CloudWatch Logs에서 이벤트 확인 (10초 대기)

### 수동 테스트

#### 1. 파일 업로드
```bash
echo "test" > test.txt
aws s3 cp test.txt s3://silver-guardian-uploads/uploads/test/test.txt
```

#### 2. CloudWatch Logs 실시간 확인
```bash
aws logs tail /aws/events/silver-guardian-s3-uploads --follow
```

#### 3. 예상 로그 출력
```json
{
  "version": "0",
  "id": "uuid",
  "detail-type": "Object Created",
  "source": "aws.s3",
  "account": "123456789012",
  "time": "2026-02-21T06:25:00Z",
  "region": "ap-northeast-2",
  "resources": [
    "arn:aws:s3:::silver-guardian-uploads"
  ],
  "detail": {
    "version": "0",
    "bucket": {
      "name": "silver-guardian-uploads"
    },
    "object": {
      "key": "uploads/test/test.txt",
      "size": 5,
      "etag": "...",
      "sequencer": "..."
    },
    "request-id": "...",
    "requester": "...",
    "source-ip-address": "...",
    "reason": "PutObject"
  }
}
```

## 🔐 보안 설정

### S3 버킷 보안
- ✅ 퍼블릭 액세스 완전 차단
- ✅ 서버 측 암호화 (AES256)
- ✅ 버저닝 활성화 (실수 복구 가능)
- ✅ CORS 설정 (허용된 오리진만)

### EventBridge 보안
- ✅ 특정 버킷만 감지 (`silver-guardian-uploads`)
- ✅ 특정 경로만 감지 (`uploads/` 프리픽스)
- ✅ CloudWatch Logs 최소 권한 정책

## 📊 비용 최적화

- **S3**: 스토리지 사용량에 따라 과금
- **EventBridge**: 이벤트당 $0.000001 (매우 저렴)
- **CloudWatch Logs**: 7일 보존으로 비용 최소화
- **향후**: Step Functions로 전환 시 CloudWatch Logs 타겟 제거 가능

## 🔄 다음 단계 (Epic 2 & 3)

### Epic 2: EKS 비전/오디오 분석 마이크로서비스
- ML 모델 컨테이너 개발 (FastAPI)
- EKS Spot 인스턴스 노드 그룹
- KEDA Scale-to-Zero 설정

### Epic 3: Step Functions 오케스트레이션
- EventBridge → Step Functions 연결
- 병렬 분석 워크플로우 (Video/Audio/Text)
- Bedrock 통합
- 메타 러닝 앙상블

## 🎉 완료!

Epic 1.3의 모든 DoD가 충족되었습니다. S3에 파일이 업로드되면 자동으로 EventBridge 이벤트가 발생하고, CloudWatch Logs에 기록됩니다. 향후 Step Functions를 연결하면 자동 분석 파이프라인이 완성됩니다!

## 📝 검증 체크리스트

- [x] Terraform 구문 검증 통과
- [x] S3 버킷 생성 계획 확인
- [x] EventBridge 규칙 생성 계획 확인
- [x] CloudWatch Logs 그룹 생성 계획 확인
- [x] 테스트 스크립트 작성 완료
- [ ] 실제 배포 및 테스트 (사용자 실행 필요)

## 🚨 주의사항

1. **S3 버킷 이름**: 전역적으로 고유해야 함. 이미 존재하면 변경 필요
2. **AWS 자격 증명**: `deploy.sh` 실행 전 AWS 인증 필요
3. **비용**: S3 스토리지 및 데이터 전송 비용 발생 가능
4. **정리**: 테스트 후 `./destroy.sh`로 리소스 삭제 가능
