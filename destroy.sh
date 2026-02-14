#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CRED_FILE=".env.aws"

echo -e "${RED}=== Silver Guardian 인프라 삭제 마법사 (경고: 모든 리소스가 제거됩니다) ===${NC}"

# 함수: 현재 인증 상태 확인
check_auth() {
    aws sts get-caller-identity > /dev/null 2>&1
    return $?
}

# 1. 인증 정보 로드
if check_auth; then
    echo -e "✅ ${GREEN}현재 세션의 AWS 자격 증명을 사용합니다.${NC}"
elif [ -f "$CRED_FILE" ]; then
    echo -e "📂 ${YELLOW}저장된 인증 파일($CRED_FILE)을 불러옵니다...${NC}"
    export $(grep -v '^#' $CRED_FILE | xargs)
    
    if check_auth; then
        echo -e "✅ ${GREEN}로그인 성공!${NC}"
    else
        echo -e "❌ ${RED}저장된 인증 정보가 만료되었습니다. deploy.sh를 다시 실행해 로그인해주세요.${NC}"
        exit 1
    fi
else
    echo -e "❌ ${RED}인증 정보를 찾을 수 없습니다. deploy.sh를 먼저 실행하거나 AWS 키를 설정해주세요.${NC}"
    exit 1
fi

echo ""
echo -e "${RED}정말로 모든 인프라(EKS, RDS, Redis, Bastion 등)를 삭제하시겠습니까?${NC}"
echo -e "삭제 후에는 복구할 수 없습니다."
read -p "삭제하려면 'destroy' 라고 입력하세요: " CONFIRM_TEXT

if [[ "$CONFIRM_TEXT" != "destroy" ]]; then
    echo "입력값이 일치하지 않아 취소합니다."
    exit 0
fi

# Terraform 실행
cd terraform || exit

echo -e "${RED}[1/2] 삭제 계획 확인 (destroy plan)${NC}"
# destroy는 실수하면 큰일나므로 plan을 먼저 보여주진 않고 바로 실행 단계에서 확인을 받습니다.

echo -e "${RED}[2/2] 리소스 삭제 시작... (약 10~20분 소요)${NC}"
# auto-approve를 쓰지 않고, 테라폼이 보여주는 삭제 리스트를 보고 한 번 더 'yes'를 입력하게 합니다.
terraform destroy

echo ""
echo -e "${GREEN}=== 삭제 완료되었습니다 ===${NC}"