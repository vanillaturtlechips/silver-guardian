# Step Functions 배포 및 테스트 가이드

## 빠른 시작

### 1. Terraform 배포
```bash
cd terraform
terraform init
terraform apply -target=aws_sfn_state_machine.analysis_workflow
```

### 2. 배포 확인
```bash
# State Machine ARN 확인
terraform output step_functions_arn

# AWS Console에서 확인
# https://console.aws.amazon.com/states/home?region=ap-northeast-2
```

## 테스트 시나리오

### 시나리오 1: 수동 실행 (간단한 테스트)

```bash
# State Machine ARN 가져오기
STATE_MACHINE_ARN=$(terraform output -raw step_functions_arn)

# 수동 실행
aws stepfunctions start-execution \
  --state-machine-arn $STATE_MACHINE_ARN \
  --input '{
    "detail": {
      "bucket": {"name": "silver-guardian-uploads"},
      "object": {
        "key": "uploads/test/sample-video.mp4",
        "size": 5242880
      }
    }
  }' \
  --region ap-northeast-2

# 실행 ARN 저장
EXECUTION_ARN=<output-execution-arn>
```

### 시나리오 2: S3 업로드 트리거 (실제 워크플로우)

```bash
# 1. 테스트 비디오 업로드
aws s3 cp test-video.mp4 s3://silver-guardian-uploads/uploads/test/video.mp4

# 2. EventBridge 이벤트 확인 (1-2분 대기)
aws logs tail /aws/events/silver-guardian-s3-uploads --follow

# 3. Step Functions 실행 확인
aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --max-results 5 \
  --region ap-northeast-2
```

### 시나리오 3: 실행 상태 모니터링

```bash
# 최근 실행 ARN 가져오기
EXECUTION_ARN=$(aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --max-results 1 \
  --query 'executions[0].executionArn' \
  --output text \
  --region ap-northeast-2)

# 실행 상태 확인
aws stepfunctions describe-execution \
  --execution-arn $EXECUTION_ARN \
  --region ap-northeast-2

# 실행 히스토리 확인
aws stepfunctions get-execution-history \
  --execution-arn $EXECUTION_ARN \
  --region ap-northeast-2 \
  | jq '.events[] | select(.type | contains("StateEntered"))'
```

## 로그 확인

### Step Functions 로그
```bash
# 실시간 로그 스트리밍
aws logs tail /aws/stepfunctions/silver-guardian-analysis --follow

# 특정 시간대 로그
aws logs filter-log-events \
  --log-group-name /aws/stepfunctions/silver-guardian-analysis \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --region ap-northeast-2
```

### EventBridge 로그
```bash
aws logs tail /aws/events/silver-guardian-s3-uploads --follow
```

## 문제 해결

### 1. Step Functions 실행 실패

#### 원인 확인
```bash
# 실행 상세 정보
aws stepfunctions describe-execution \
  --execution-arn $EXECUTION_ARN \
  --query 'cause' \
  --output text
```

#### 일반적인 오류

**오류 1: EKS 서비스 연결 실패**
```
Error: Connection timeout
```
해결:
- EKS Pod가 실행 중인지 확인: `kubectl get pods -l workload=ml`
- Service 엔드포인트 확인: `kubectl get svc audio-analyzer video-analyzer`
- KEDA가 Pod를 스케일 업했는지 확인: `kubectl get scaledobject`

**오류 2: Bedrock 권한 오류**
```
Error: AccessDeniedException
```
해결:
- IAM Role 권한 확인
- Bedrock 모델 접근 권한 확인
- 리전 확인 (ap-northeast-2)

**오류 3: Lambda 함수 없음**
```
Error: Function not found
```
해결:
- Epic 3.3에서 Lambda 함수 생성 필요
- 임시로 SaveToDatabase 단계 주석 처리

### 2. EventBridge 트리거 안됨

#### 확인 사항
```bash
# EventBridge 규칙 확인
aws events describe-rule \
  --name silver-guardian-s3-upload \
  --region ap-northeast-2

# 타겟 확인
aws events list-targets-by-rule \
  --rule silver-guardian-s3-upload \
  --region ap-northeast-2

# S3 이벤트 알림 확인
aws s3api get-bucket-notification-configuration \
  --bucket silver-guardian-uploads
```

#### 해결
```bash
# S3 EventBridge 활성화 확인
aws s3api put-bucket-notification-configuration \
  --bucket silver-guardian-uploads \
  --notification-configuration '{
    "EventBridgeConfiguration": {}
  }'
```

### 3. Parallel 브랜치 일부 실패

#### 정상 동작
- Fallback 메커니즘이 작동하여 0.5 값 반환
- 나머지 브랜치는 정상 실행
- 최종 결과는 성공

#### 확인
```bash
# 실행 히스토리에서 Fallback 확인
aws stepfunctions get-execution-history \
  --execution-arn $EXECUTION_ARN \
  --region ap-northeast-2 \
  | jq '.events[] | select(.type == "TaskFailed")'
```

## 성능 테스트

### 부하 테스트
```bash
# 10개 파일 동시 업로드
for i in {1..10}; do
  aws s3 cp test-video.mp4 \
    s3://silver-guardian-uploads/uploads/test/video-$i.mp4 &
done
wait

# 실행 수 확인
aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --status-filter RUNNING \
  --region ap-northeast-2 \
  | jq '.executions | length'
```

### 실행 시간 측정
```bash
# 최근 10개 실행의 평균 시간
aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --max-results 10 \
  --region ap-northeast-2 \
  | jq '.executions[] | 
    ((.stopDate // now) - .startDate) | 
    . / 1000' \
  | jq -s 'add / length'
```

## AWS Console 확인

### Step Functions Console
```
https://console.aws.amazon.com/states/home?region=ap-northeast-2#/statemachines
```

1. `silver-guardian-analysis-workflow` 클릭
2. "Executions" 탭에서 실행 기록 확인
3. 특정 실행 클릭 → "Graph inspector"에서 시각화 확인

### CloudWatch Console
```
https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups
```

1. `/aws/stepfunctions/silver-guardian-analysis` 로그 그룹 확인
2. 최근 로그 스트림 확인

## 정리

### Step Functions 삭제
```bash
cd terraform
terraform destroy -target=aws_sfn_state_machine.analysis_workflow
```

### 실행 기록 삭제
```bash
# 모든 실행 중지
aws stepfunctions list-executions \
  --state-machine-arn $STATE_MACHINE_ARN \
  --status-filter RUNNING \
  --region ap-northeast-2 \
  | jq -r '.executions[].executionArn' \
  | xargs -I {} aws stepfunctions stop-execution \
      --execution-arn {} \
      --region ap-northeast-2
```

## 다음 단계

- [ ] Lambda 함수 개발 (Epic 3.3)
- [ ] Transcribe 통합 (Epic 3.2)
- [ ] 프론트엔드 연동
- [ ] 프로덕션 모니터링 설정
