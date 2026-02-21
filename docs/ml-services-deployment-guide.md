# ML 서비스 EKS 배포 가이드

## 빠른 시작

### 1. 사전 준비
```bash
# AWS 자격 증명 확인
aws sts get-caller-identity

# kubectl 설치 확인
kubectl version --client

# Docker 실행 확인
docker ps
```

### 2. 전체 배포 (원클릭)
```bash
./deploy-ml-services.sh
```

## 단계별 배포

### Step 1: ECR에 이미지 푸시
```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com

# Audio Analyzer
cd ml-services/audio-analyzer
docker build -t audio-analyzer:latest .
docker tag audio-analyzer:latest \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest
docker push 009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/audio-analyzer:latest

# Video Analyzer
cd ../video-analyzer
docker build -t video-analyzer:latest .
docker tag video-analyzer:latest \
  009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/video-analyzer:latest
docker push 009946608368.dkr.ecr.ap-northeast-2.amazonaws.com/video-analyzer:latest
```

### Step 2: Terraform으로 ML 노드 그룹 생성
```bash
cd terraform
terraform init
terraform plan -target=module.eks.aws_eks_node_group.this[\"ml_spot\"]
terraform apply -target=module.eks.aws_eks_node_group.this[\"ml_spot\"]
```

### Step 3: kubectl 설정
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name silver-guardian-cluster
kubectl get nodes
```

### Step 4: ML 서비스 배포
```bash
kubectl apply -f k8s/ml-services/audio-analyzer.yaml
kubectl apply -f k8s/ml-services/video-analyzer.yaml
```

### Step 5: 배포 확인
```bash
# 노드 확인
kubectl get nodes -l workload=ml

# Pod 확인
kubectl get pods -l workload=ml

# 서비스 확인
kubectl get svc audio-analyzer video-analyzer
```

## 테스트

### 로컬에서 서비스 테스트
```bash
# 포트 포워딩
kubectl port-forward svc/audio-analyzer 8000:8000 &
kubectl port-forward svc/video-analyzer 8001:8001 &

# API 호출
curl http://localhost:8000/health
curl http://localhost:8001/health

# 분석 요청 (S3 파일 필요)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "s3_bucket": "silver-guardian-uploads",
    "s3_key": "uploads/test/video.mp4"
  }'
```

## 문제 해결

### Pod가 Pending 상태
```bash
# 이벤트 확인
kubectl describe pod <pod-name>

# 노드 확인
kubectl get nodes -l workload=ml

# Spot 노드가 없으면 수동 스케일링
kubectl scale deployment audio-analyzer --replicas=1
```

### 이미지 Pull 실패
```bash
# ECR 권한 확인
aws ecr describe-repositories

# 이미지 존재 확인
aws ecr describe-images --repository-name audio-analyzer
aws ecr describe-images --repository-name video-analyzer
```

### Taint/Toleration 오류
```bash
# 노드 Taint 확인
kubectl describe node <node-name> | grep Taints

# Pod Toleration 확인
kubectl get pod <pod-name> -o yaml | grep -A 5 tolerations
```

## 정리

### ML 서비스만 삭제
```bash
kubectl delete -f k8s/ml-services/audio-analyzer.yaml
kubectl delete -f k8s/ml-services/video-analyzer.yaml
```

### ML 노드 그룹 삭제
```bash
cd terraform
terraform destroy -target=module.eks.aws_eks_node_group.this[\"ml_spot\"]
```

## 유용한 명령어

```bash
# 실시간 Pod 상태 모니터링
kubectl get pods -l workload=ml -w

# Pod 로그 스트리밍
kubectl logs -f deployment/audio-analyzer
kubectl logs -f deployment/video-analyzer

# 리소스 사용량
kubectl top nodes -l workload=ml
kubectl top pods -l workload=ml

# 노드 상세 정보
kubectl describe node <node-name>

# 서비스 엔드포인트
kubectl get endpoints audio-analyzer video-analyzer
```

## 다음 단계

- [ ] KEDA 설치 (Epic 2.4)
- [ ] ScaledObject 설정
- [ ] Step Functions 연동 (Epic 3)
- [ ] 프로덕션 모니터링 설정
