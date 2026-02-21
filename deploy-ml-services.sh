#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== ML 서비스 EKS 배포 스크립트 ===${NC}"
echo ""

# 1. ECR 로그인
echo -e "${YELLOW}[1/5] ECR 로그인...${NC}"
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ECR 로그인 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ECR 로그인 성공${NC}"
echo ""

# 2. Docker 이미지 빌드 및 푸시
echo -e "${YELLOW}[2/5] Docker 이미지 빌드 및 푸시...${NC}"

# Audio Analyzer
echo -e "${CYAN}Audio Analyzer 빌드 중...${NC}"
cd ml-services/audio-analyzer
docker build -t audio-analyzer:latest .
docker tag audio-analyzer:latest \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest
docker push 009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Audio Analyzer 푸시 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Audio Analyzer 푸시 완료${NC}"

# Video Analyzer
echo -e "${CYAN}Video Analyzer 빌드 중...${NC}"
cd ../video-analyzer
docker build -t video-analyzer:latest .
docker tag video-analyzer:latest \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/video-analyzer:latest
docker push 009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/video-analyzer:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Video Analyzer 푸시 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Video Analyzer 푸시 완료${NC}"

cd ../..
echo ""

# 3. Terraform 적용 (ML 노드 그룹 + KEDA)
echo -e "${YELLOW}[3/6] Terraform으로 ML Spot 노드 그룹 및 KEDA 설치...${NC}"
cd terraform
terraform init
terraform plan -target=module.eks.aws_eks_node_group.this[\"ml_spot\"] -target=helm_release.keda

read -p "위 계획대로 진행하시겠습니까? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "취소되었습니다."
    exit 0
fi

terraform apply -target=module.eks.aws_eks_node_group.this[\"ml_spot\"] -target=helm_release.keda -auto-approve

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Terraform 적용 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ML Spot 노드 그룹 및 KEDA 설치 완료${NC}"

cd ..
echo ""

# 4. kubectl 설정
echo -e "${YELLOW}[4/6] kubectl 설정 업데이트...${NC}"
aws eks update-kubeconfig --region ap-northeast-2 --name silver-guardian-cluster

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ kubectl 설정 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ kubectl 설정 완료${NC}"
echo ""

# 5. Kubernetes 배포
echo -e "${YELLOW}[5/6] Kubernetes에 ML 서비스 배포...${NC}"

kubectl apply -f k8s/ml-services/audio-analyzer.yaml
kubectl apply -f k8s/ml-services/video-analyzer.yaml

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Kubernetes 배포 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Kubernetes 배포 완료${NC}"
echo ""

# 6. KEDA ScaledObject 배포
echo -e "${YELLOW}[6/6] KEDA ScaledObject 배포...${NC}"

# KEDA가 준비될 때까지 대기
echo -e "${CYAN}KEDA 준비 대기 중...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=keda-operator -n keda --timeout=120s

kubectl apply -f k8s/ml-services/audio-analyzer-scaledobject.yaml
kubectl apply -f k8s/ml-services/video-analyzer-scaledobject.yaml

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ScaledObject 배포 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ScaledObject 배포 완료${NC}"
echo ""

# 7. 배포 상태 확인
echo -e "${CYAN}=== 배포 상태 확인 ===${NC}"
echo ""
echo -e "${YELLOW}노드 확인:${NC}"
kubectl get nodes -l workload=ml

echo ""
echo -e "${YELLOW}Pod 상태:${NC}"
kubectl get pods -l workload=ml

echo ""
echo -e "${YELLOW}서비스 확인:${NC}"
kubectl get svc audio-analyzer video-analyzer

echo ""
echo -e "${YELLOW}KEDA ScaledObject 확인:${NC}"
kubectl get scaledobject

echo ""
echo -e "${GREEN}🎉 === 배포 완료! ===${NC}"
echo ""
echo -e "${CYAN}유용한 명령어:${NC}"
echo -e "  Pod 로그: ${YELLOW}kubectl logs -f deployment/audio-analyzer${NC}"
echo -e "  Pod 상태: ${YELLOW}kubectl get pods -w${NC}"
echo -e "  노드 상태: ${YELLOW}kubectl get nodes${NC}"
echo -e "  ScaledObject 상태: ${YELLOW}kubectl get scaledobject${NC}"
echo -e "  HPA 상태: ${YELLOW}kubectl get hpa${NC}"
echo -e "  서비스 테스트: ${YELLOW}kubectl port-forward svc/audio-analyzer 8000:8000${NC}"
