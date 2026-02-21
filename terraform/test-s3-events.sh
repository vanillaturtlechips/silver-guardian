#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== S3 이벤트 테스트 스크립트 ===${NC}"
echo ""

# 1. S3 버킷 확인
echo -e "${YELLOW}[1/4] S3 버킷 확인 중...${NC}"
BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null)

if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}❌ S3 버킷을 찾을 수 없습니다. Terraform apply를 먼저 실행하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ S3 버킷: $BUCKET_NAME${NC}"
echo ""

# 2. EventBridge 규칙 확인
echo -e "${YELLOW}[2/4] EventBridge 규칙 확인 중...${NC}"
RULE_NAME=$(terraform output -raw eventbridge_rule_name 2>/dev/null)
echo -e "${GREEN}✅ EventBridge 규칙: $RULE_NAME${NC}"
echo ""

# 3. 테스트 파일 업로드
echo -e "${YELLOW}[3/4] 테스트 파일 업로드 중...${NC}"
TEST_FILE="/tmp/test-video-$(date +%s).txt"
echo "This is a test file for S3 event trigger" > $TEST_FILE

aws s3 cp $TEST_FILE s3://$BUCKET_NAME/uploads/test/test-video.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 테스트 파일 업로드 완료${NC}"
else
    echo -e "${RED}❌ 파일 업로드 실패${NC}"
    exit 1
fi
echo ""

# 4. CloudWatch Logs 확인
echo -e "${YELLOW}[4/4] CloudWatch Logs 확인 중 (10초 대기)...${NC}"
sleep 10

LOG_GROUP=$(terraform output -raw cloudwatch_log_group 2>/dev/null)
echo -e "${CYAN}로그 그룹: $LOG_GROUP${NC}"

# 최근 로그 스트림 가져오기
LATEST_STREAM=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text 2>/dev/null)

if [ "$LATEST_STREAM" != "None" ] && [ -n "$LATEST_STREAM" ]; then
    echo -e "${GREEN}✅ 로그 스트림 발견: $LATEST_STREAM${NC}"
    echo ""
    echo -e "${CYAN}=== 최근 이벤트 로그 ===${NC}"
    
    aws logs get-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$LATEST_STREAM" \
        --limit 5 \
        --query 'events[*].message' \
        --output text | jq '.' 2>/dev/null || \
    aws logs get-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$LATEST_STREAM" \
        --limit 5 \
        --query 'events[*].message' \
        --output text
    
    echo ""
    echo -e "${GREEN}🎉 === S3 이벤트가 성공적으로 CloudWatch Logs에 기록되었습니다! === 🎉${NC}"
else
    echo -e "${YELLOW}⚠️  아직 로그가 생성되지 않았습니다. 몇 분 후 다시 확인하세요:${NC}"
    echo -e "${CYAN}aws logs tail $LOG_GROUP --follow${NC}"
fi

# 정리
rm -f $TEST_FILE

echo ""
echo -e "${CYAN}=== 수동 확인 명령어 ===${NC}"
echo -e "로그 실시간 확인: ${YELLOW}aws logs tail $LOG_GROUP --follow${NC}"
echo -e "S3 버킷 확인: ${YELLOW}aws s3 ls s3://$BUCKET_NAME/uploads/ --recursive${NC}"
