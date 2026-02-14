#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CRED_FILE=".env.aws"
GITIGNORE=".gitignore"

echo -e "${GREEN}=== Silver Guardian 인프라 배포 마법사 (스마트 로그인) ===${NC}"

# 함수: 현재 인증 상태 확인
check_auth() {
    # AWS CLI를 통해 현재 자격 증명이 유효한지 확인 (조용히 실행)
    aws sts get-caller-identity > /dev/null 2>&1
    return $?
}

# 1. 기존 인증 확인
if check_auth; then
    echo -e "✅ ${GREEN}이미 유효한 AWS 자격 증명이 확인되었습니다.${NC}"
else
    # 2. 저장된 파일이 있는지 확인
    if [ -f "$CRED_FILE" ]; then
        echo -e "📂 ${YELLOW}저장된 인증 파일($CRED_FILE)을 발견했습니다. 불러오는 중...${NC}"
        # .env.aws 파일을 읽어서 환경변수로 내보냄
        export $(grep -v '^#' $CRED_FILE | xargs)
    fi

    # 3. 파일 로드 후 다시 확인
    if check_auth; then
        echo -e "✅ ${GREEN}저장된 정보로 로그인 성공!${NC}"
    else
        # 4. 인증 실패 시 입력 받기
        echo -e "❌ ${RED}저장된 인증 정보가 없거나 만료되었습니다.${NC}"
        echo "새로운 AWS 자격 증명을 입력해주세요."
        echo ""
        
        read -p "AWS Access Key ID: " INPUT_ACCESS_KEY
        read -s -p "AWS Secret Access Key: " INPUT_SECRET_KEY
        echo ""
        echo ""

        # 환경 변수 적용
        export AWS_ACCESS_KEY_ID=$INPUT_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$INPUT_SECRET_KEY
        export AWS_DEFAULT_REGION="ap-northeast-2"

        # 입력받은 정보 검증
        if ! check_auth; then
            echo -e "❌ ${RED}입력하신 정보가 올바르지 않습니다. 다시 실행해주세요.${NC}"
            exit 1
        fi

        # 5. 정보 저장 여부 묻기
        echo -e "✅ ${GREEN}로그인 확인되었습니다.${NC}"
        read -p "이 정보를 로컬 파일($CRED_FILE)에 저장하여 다음에 다시 묻지 않게 하시겠습니까? (y/n): " SAVE_ANS
        
        if [[ "$SAVE_ANS" == "y" || "$SAVE_ANS" == "Y" ]]; then
            echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" > $CRED_FILE
            echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >> $CRED_FILE
            echo "AWS_DEFAULT_REGION=ap-northeast-2" >> $CRED_FILE
            chmod 600 $CRED_FILE # 나만 읽을 수 있게 권한 축소
            echo -e "💾 ${GREEN}인증 정보가 $CRED_FILE 에 저장되었습니다.${NC}"

            # .gitignore에 자동 추가 (보안 사고 방지)
            if [ -f "$GITIGNORE" ]; then
                if ! grep -q "$CRED_FILE" "$GITIGNORE"; then
                    echo "" >> "$GITIGNORE"
                    echo "# AWS Credentials" >> "$GITIGNORE"
                    echo "$CRED_FILE" >> "$GITIGNORE"
                    echo -e "🔒 ${YELLOW}$CRED_FILE 파일을 .gitignore에 추가했습니다. (GitHub 유출 방지)${NC}"
                fi
            else
                echo "$CRED_FILE" > "$GITIGNORE"
                echo -e "🔒 ${YELLOW}.gitignore 파일을 생성하고 인증 파일을 숨겼습니다.${NC}"
            fi
        fi
    fi
fi

echo ""
echo "----------------------------------------------------"
# 현재 로그인된 계정 정보 출력
CURRENT_USER=$(aws sts get-caller-identity --query Arn --output text)
echo -e "현재 사용자: ${YELLOW}$CURRENT_USER${NC}"
echo "----------------------------------------------------"
echo ""

# Terraform 실행 부분
cd terraform || exit

echo -e "${GREEN}[1/3] Terraform 초기화 (init)${NC}"
terraform init

if [ $? -ne 0 ]; then
    echo "Terraform init 실패!"
    exit 1
fi

echo -e "${GREEN}[2/3] 인프라 변경사항 확인 (plan)${NC}"
terraform plan

echo ""
read -p "위 계획대로 진행하시겠습니까? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "취소되었습니다."
    exit 0
fi

echo -e "${GREEN}[3/3] 인프라 적용 시작 (apply)${NC}"
terraform apply -auto-approve

echo ""
echo -e "${GREEN}=== 🎉 배포 완료! ===${NC}"
terraform output