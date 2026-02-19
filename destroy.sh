#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

CRED_FILE=".env.aws"

echo -e "${RED}=== Silver Guardian 인프라 삭제 마법사 ===${NC}"
echo -e "${YELLOW}주의: 이 작업은 모든 AWS 리소스와 데이터를 영구적으로 삭제합니다.${NC}"

# 인증 로직
check_auth() { aws sts get-caller-identity > /dev/null 2>&1; return $?; }

if check_auth; then
    echo -e "✅ ${GREEN}현재 세션의 AWS 자격 증명을 사용합니다.${NC}"
elif [ -f "$CRED_FILE" ]; then
    export $(grep -v '^#' $CRED_FILE | xargs)
    if check_auth; then echo -e "✅ ${GREEN}로그인 성공!${NC}"; else echo -e "❌ ${RED}인증 만료.${NC}"; exit 1; fi
else
    echo -e "❌ ${RED}인증 정보 없음.${NC}"; exit 1; fi

read -p "진행하려면 'destroy' 라고 입력하세요: " CONFIRM_TEXT
if [[ "$CONFIRM_TEXT" != "destroy" ]]; then exit 0; fi

cd terraform || exit

# ---------------------------------------------------------
# [핵심] 1단계: Kubernetes 내부 리소스 및 NLB 안전 삭제
# ---------------------------------------------------------
echo ""
echo -e "${CYAN}[1/2단계] Kubernetes 앱 및 로드밸런서(NLB) 선행 삭제 중...${NC}"
echo "이 작업을 통해 VPC 삭제 시 발생하는 의존성 오류를 방지합니다."

# Nginx Ingress, ArgoCD, 그리고 ArgoCD Ingress를 콕 집어서 먼저 삭제합니다.
# 이 명령어가 성공적으로 끝나야 AWS NLB가 깔끔하게 증발합니다.
terraform destroy \
  -target=kubernetes_ingress_v1.argocd_ingress \
  -target=helm_release.argocd \
  -target=helm_release.nginx_ingress \
  -auto-approve

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 1단계(Kubernetes 리소스) 삭제 중 오류가 발생했습니다.${NC}"
    echo "클러스터 연결 상태를 확인하거나 수동으로 리소스를 정리해야 할 수 있습니다."
    exit 1
fi
echo -e "${GREEN}✅ 1단계 삭제 완료: 로드밸런서 및 연결 리소스 제거 성공!${NC}"

# ---------------------------------------------------------
# 2단계: 전체 인프라 뼈대 삭제 (EKS, VPC, DB 등)
# ---------------------------------------------------------
echo ""
echo -e "${CYAN}[2/2단계] 전체 AWS 인프라 삭제 시작... (약 15분 소요)${NC}"

if terraform destroy -auto-approve; then
    echo ""
    echo -e "${GREEN}🎉 === 모든 인프라가 오류 없이 깔끔하게 삭제되었습니다! === 🎉${NC}"
else
    echo ""
    echo -e "${RED}=== 삭제 중 AWS 계정 수준의 오류가 발생했습니다. 로그를 확인하세요. ===${NC}"
    exit 1
fi