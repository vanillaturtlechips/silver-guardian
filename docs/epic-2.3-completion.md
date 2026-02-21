# Epic 2.3: Terraform EKS Spot 인스턴스 노드 그룹 구성

## ✅ 완료된 작업 (DoD)

### 1. terraform/eks.tf 수정하여 ML 전용 Managed Node Group 추가
- ✅ `ml_spot` 노드 그룹 추가
- ✅ Scale-to-zero 설정 (min=0, desired=0)
- ✅ 최대 5개 노드까지 확장 가능
- ✅ 레이블 설정: `workload=ml`, `nodeType=spot`

### 2. 해당 Node Group을 Spot Instance로 설정
- ✅ `capacity_type = "SPOT"` 설정
- ✅ CPU 최적화 인스턴스 타입 선택
  - `c5.xlarge` (4 vCPU, 8GB RAM)
  - `c5.2xlarge` (8 vCPU, 16GB RAM)
  - `c5a.xlarge` (4 vCPU, 8GB RAM)
- ✅ 다중 인스턴스 타입으로 가용성 향상
- ✅ 비용 절감: 온디맨드 대비 최대 70% 저렴

### 3. ML 워크로드만 이 노드 그룹에 뜨도록 Taint/Toleration 설정
- ✅ Taint 설정: `workload=ml:NoSchedule`
- ✅ Kubernetes 매니페스트에 Toleration 추가
- ✅ NodeSelector로 명시적 노드 선택
- ✅ 일반 워크로드와 ML 워크로드 격리

## 📁 생성/수정된 파일

```
terraform/
└── eks.tf                                  # 수정: ml_spot 노드 그룹 추가

k8s/ml-services/
├── audio-analyzer.yaml                     # 신규: Audio Analyzer 배포
└── video-analyzer.yaml                     # 신규: Video Analyzer 배포

deploy-ml-services.sh                       # 신규: 통합 배포 스크립트
```

## 🏗️ 노드 그룹 구성

### General 노드 그룹 (기존)
- **용도**: 일반 워크로드 (백엔드, 프론트엔드, DB)
- **인스턴스**: t3.medium (온디맨드)
- **크기**: 1-3 노드 (desired: 2)
- **비용**: 안정적이지만 비쌈

### ML Spot 노드 그룹 (신규)
- **용도**: ML 추론 워크로드 (Audio/Video Analyzer)
- **인스턴스**: c5.xlarge, c5.2xlarge, c5a.xlarge (Spot)
- **크기**: 0-5 노드 (desired: 0, Scale-to-zero)
- **비용**: 온디맨드 대비 70% 절감
- **Taint**: `workload=ml:NoSchedule`

## 🎯 Taint/Toleration 동작 방식

### Taint (노드에 설정)
```yaml
taints:
- key: "workload"
  value: "ml"
  effect: "NoSchedule"
```
**의미**: "workload=ml" Toleration이 없는 Pod는 이 노드에 스케줄링 불가

### Toleration (Pod에 설정)
```yaml
tolerations:
- key: "workload"
  operator: "Equal"
  value: "ml"
  effect: "NoSchedule"
```
**의미**: 이 Pod는 "workload=ml" Taint를 무시하고 스케줄링 가능

### NodeSelector (추가 제약)
```yaml
nodeSelector:
  workload: ml
  nodeType: spot
```
**의미**: 반드시 이 레이블을 가진 노드에만 스케줄링

## 📊 리소스 할당

### Audio Analyzer
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Video Analyzer
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "3Gi"
    cpu: "2000m"
```

### 노드 용량 계산
- **c5.xlarge**: 4 vCPU, 8GB RAM
  - Audio Analyzer 1개 + Video Analyzer 1개 = 가능
- **c5.2xlarge**: 8 vCPU, 16GB RAM
  - Audio Analyzer 2개 + Video Analyzer 2개 = 가능

## 🚀 배포 방법

### 1. 자동 배포 (권장)
```bash
./deploy-ml-services.sh
```

스크립트가 자동으로:
1. ECR 로그인
2. Docker 이미지 빌드 및 푸시
3. Terraform으로 ML 노드 그룹 생성
4. kubectl 설정
5. Kubernetes에 서비스 배포

### 2. 수동 배포

#### Step 1: Terraform 적용
```bash
cd terraform
terraform init
terraform plan -target=module.eks.aws_eks_node_group.this[\"ml_spot\"]
terraform apply -target=module.eks.aws_eks_node_group.this[\"ml_spot\"]
```

#### Step 2: kubectl 설정
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name silver-guardian-cluster
```

#### Step 3: 노드 확인
```bash
kubectl get nodes -l workload=ml
```

#### Step 4: 서비스 배포
```bash
kubectl apply -f k8s/ml-services/audio-analyzer.yaml
kubectl apply -f k8s/ml-services/video-analyzer.yaml
```

#### Step 5: 상태 확인
```bash
kubectl get pods -l workload=ml
kubectl get svc audio-analyzer video-analyzer
```

## 🧪 테스트 방법

### 1. 노드 확인
```bash
# ML 노드 그룹 확인
kubectl get nodes -l workload=ml

# 노드 상세 정보
kubectl describe node <node-name>
```

### 2. Pod 스케줄링 확인
```bash
# Pod 상태
kubectl get pods -l workload=ml -o wide

# Pod가 ML 노드에 스케줄링되었는지 확인
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeName}'
```

### 3. Taint/Toleration 검증
```bash
# 일반 Pod 배포 시도 (실패해야 정상)
kubectl run test-pod --image=nginx --restart=Never

# ML Pod 배포 시도 (성공해야 정상)
kubectl apply -f k8s/ml-services/audio-analyzer.yaml
```

### 4. 서비스 테스트
```bash
# 포트 포워딩
kubectl port-forward svc/audio-analyzer 8000:8000
kubectl port-forward svc/video-analyzer 8001:8001

# API 호출
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## 💰 비용 분석

### Spot 인스턴스 절감 효과

| 인스턴스 | 온디맨드 (시간당) | Spot (시간당) | 절감율 |
|----------|-------------------|---------------|--------|
| c5.xlarge | $0.17 | ~$0.05 | 70% |
| c5.2xlarge | $0.34 | ~$0.10 | 70% |
| c5a.xlarge | $0.154 | ~$0.046 | 70% |

### 월간 비용 예상 (24/7 운영 시)
- **온디맨드**: $122.4/월 (c5.xlarge 1대)
- **Spot**: $36/월 (c5.xlarge 1대)
- **절감액**: $86.4/월 (70%)

### Scale-to-Zero 추가 절감
- 트래픽 없을 때 노드 0개 → **추가 비용 없음**
- KEDA 연동 시 (Epic 2.4) 자동 스케일링

## 🔐 보안 고려사항

### IAM Role (IRSA)
- ✅ Pod가 S3 접근 시 IAM Role 사용 (환경변수 대신)
- ⚠️ TODO: ServiceAccount에 IAM Role 연결

### Network Policy
- ⚠️ TODO: ML Pod 간 통신 제한
- ⚠️ TODO: 외부 접근 제한 (내부 서비스만)

### Spot 인스턴스 중단 처리
- ✅ 다중 인스턴스 타입으로 가용성 확보
- ✅ Kubernetes가 자동으로 다른 노드에 재스케줄링
- ⚠️ TODO: Pod Disruption Budget 설정

## 📊 모니터링

### 노드 상태
```bash
# 노드 리스트
kubectl get nodes -l workload=ml

# 노드 리소스 사용량
kubectl top nodes -l workload=ml
```

### Pod 상태
```bash
# Pod 리스트
kubectl get pods -l workload=ml

# Pod 리소스 사용량
kubectl top pods -l workload=ml

# Pod 로그
kubectl logs -f deployment/audio-analyzer
kubectl logs -f deployment/video-analyzer
```

### 이벤트 확인
```bash
# 최근 이벤트
kubectl get events --sort-by='.lastTimestamp' | grep ml

# Spot 중단 이벤트
kubectl get events | grep "Spot"
```

## 🔄 다음 단계 (Epic 2.4)

**KEDA 도입 및 Scale-to-Zero 설정**

1. KEDA 설치 (Helm)
2. ScaledObject 매니페스트 작성
3. HTTP 트래픽 기반 자동 스케일링
4. 0개 → N개 자동 확장/축소

## 🎉 완료!

Epic 2.3의 모든 DoD가 충족되었습니다. ML 전용 Spot 인스턴스 노드 그룹이 구성되었으며, Taint/Toleration으로 워크로드가 격리되었습니다. 비용 최적화와 리소스 효율성이 크게 향상되었습니다!

## 📝 검증 체크리스트

- [x] terraform/eks.tf에 ml_spot 노드 그룹 추가
- [x] Spot 인스턴스 설정 (capacity_type = "SPOT")
- [x] CPU 최적화 인스턴스 타입 선택 (c5 계열)
- [x] Taint 설정 (workload=ml:NoSchedule)
- [x] 레이블 설정 (workload=ml, nodeType=spot)
- [x] Kubernetes 매니페스트 작성 (Toleration, NodeSelector)
- [x] 배포 스크립트 작성
- [x] Terraform 검증 통과
- [ ] 실제 배포 및 테스트 (사용자 실행 필요)
