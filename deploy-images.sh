#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ECR_ACCOUNT="009946608368"
ECR_REGION="ap-northeast-2"
ECR_URL="${ECR_ACCOUNT}.dkr.ecr.${ECR_REGION}.amazonaws.com"

# 경로 입력 (기본값 제공)
read -p "백엔드 경로 [기본: ~/Documents/sg/silver-guardian/backend]: " BACKEND_DIR
BACKEND_DIR=${BACKEND_DIR:-~/Documents/sg/silver-guardian/backend}

read -p "프론트엔드 경로 [기본: ~/Documents/sg/silver-guardian/frontend]: " FRONTEND_DIR
FRONTEND_DIR=${FRONTEND_DIR:-~/Documents/sg/silver-guardian/frontend}

echo -e "${GREEN}=== ECR 로그인 ===${NC}"
aws ecr get-login-password --region $ECR_REGION | docker login --username AWS --password-stdin $ECR_URL

if [ $? -ne 0 ]; then
    echo -e "${RED}ECR 로그인 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}=== 백엔드 빌드 & 푸시 ===${NC}"
cd $BACKEND_DIR
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $ECR_URL/silver-guardian-backend:latest \
  --push .

if [ $? -ne 0 ]; then
    echo -e "${RED}백엔드 빌드 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}=== 프론트엔드 빌드 & 푸시 ===${NC}"
cd $FRONTEND_DIR
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $ECR_URL/silver-guardian-frontend:latest \
  --push .

if [ $? -ne 0 ]; then
    echo -e "${RED}프론트엔드 빌드 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}=== 🚀 빌드 & 푸시 완료! ===${NC}"