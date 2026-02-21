#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Audio Analyzer 로컬 테스트 ===${NC}"
echo ""

# 1. Docker 이미지 확인
echo -e "${YELLOW}[1/4] Docker 이미지 확인...${NC}"
if docker images | grep -q "audio-analyzer"; then
    echo -e "${GREEN}✅ Docker 이미지 존재${NC}"
else
    echo -e "${RED}❌ Docker 이미지를 찾을 수 없습니다. 먼저 빌드하세요:${NC}"
    echo -e "${CYAN}docker build -t audio-analyzer:latest .${NC}"
    exit 1
fi
echo ""

# 2. 컨테이너 실행
echo -e "${YELLOW}[2/4] 컨테이너 실행 중...${NC}"
docker run -d --name audio-analyzer-test \
    -p 8000:8000 \
    -e AWS_REGION=${AWS_REGION:-ap-northeast-2} \
    -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    audio-analyzer:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 컨테이너 시작 완료${NC}"
else
    echo -e "${RED}❌ 컨테이너 시작 실패${NC}"
    exit 1
fi

# 대기
echo -e "${CYAN}서버 시작 대기 중 (5초)...${NC}"
sleep 5
echo ""

# 3. 헬스체크
echo -e "${YELLOW}[3/4] 헬스체크...${NC}"
HEALTH=$(curl -s http://localhost:8000/health)

if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ 헬스체크 통과${NC}"
    echo -e "${CYAN}응답: $HEALTH${NC}"
else
    echo -e "${RED}❌ 헬스체크 실패${NC}"
    docker logs audio-analyzer-test
    docker stop audio-analyzer-test
    docker rm audio-analyzer-test
    exit 1
fi
echo ""

# 4. API 문서 확인
echo -e "${YELLOW}[4/4] API 문서 확인...${NC}"
DOCS=$(curl -s http://localhost:8000/docs)

if [ -n "$DOCS" ]; then
    echo -e "${GREEN}✅ Swagger UI 접근 가능${NC}"
    echo -e "${CYAN}URL: http://localhost:8000/docs${NC}"
else
    echo -e "${RED}❌ API 문서 접근 실패${NC}"
fi
echo ""

# 5. 테스트 요청 (선택사항)
echo -e "${CYAN}=== 테스트 분석 요청 (S3 파일 필요) ===${NC}"
echo -e "${YELLOW}다음 명령어로 실제 분석 테스트:${NC}"
echo ""
echo -e "${CYAN}curl -X POST http://localhost:8000/analyze \\${NC}"
echo -e "${CYAN}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "${CYAN}  -d '{${NC}"
echo -e "${CYAN}    \"s3_bucket\": \"silver-guardian-uploads\",${NC}"
echo -e "${CYAN}    \"s3_key\": \"uploads/test/video.mp4\"${NC}"
echo -e "${CYAN}  }'${NC}"
echo ""

echo -e "${GREEN}🎉 === 로컬 테스트 완료! ===${NC}"
echo ""
echo -e "${YELLOW}컨테이너 관리:${NC}"
echo -e "  로그 확인: ${CYAN}docker logs -f audio-analyzer-test${NC}"
echo -e "  중지: ${CYAN}docker stop audio-analyzer-test${NC}"
echo -e "  삭제: ${CYAN}docker rm audio-analyzer-test${NC}"
echo -e "  재시작: ${CYAN}docker restart audio-analyzer-test${NC}"
