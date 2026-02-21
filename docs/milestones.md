# 🎯 Epic 1: 데이터 수집 파이프라인 개편 (S3 연동)

### Issue 1.1: [Backend] S3 Presigned URL 발급 gRPC API 구현

* **Labels:** `backend`, `enhancement`
* **Description:** 클라이언트가 백엔드를 거치지 않고 S3로 직접 동영상을 업로드할 수 있도록, Go 백엔드에 AWS S3 Presigned URL을 생성하여 반환하는 API를 구현합니다.
* **Tasks (DoD):**
* [ ] AWS SDK for Go (v2) 연동
* [ ] `analysis.proto`에 Presigned URL 요청/응답 메시지 정의 및 추가
* [ ] S3 PutObject에 대한 Presigned URL 생성 로직 구현 (만료 시간 설정 등)
* [ ] Presigned URL 발급 단위 테스트 작성



### Issue 1.2: [Frontend] 직접 비디오 업로드 UI 및 S3 연동

* **Labels:** `frontend`, `feature`
* **Description:** 기존 URL 입력 방식 외에, 사용자가 로컬 동영상을 직접 업로드할 수 있는 UI를 추가하고 Presigned URL을 통해 S3로 직접 전송하는 로직을 구현합니다.
* **Tasks (DoD):**
* [ ] Drag & Drop 파일 업로드 UI 컴포넌트 추가 (`shadcn/ui` 활용)
* [ ] gRPC-web을 통해 백엔드에 Presigned URL 요청
* [ ] 발급받은 URL을 사용하여 S3에 파일 직접 업로드 (axios 등 활용)
* [ ] 업로드 진행률(Progress bar) UI 구현



### Issue 1.3: [Infra] S3 업로드 이벤트 및 EventBridge 연동 설정

* **Labels:** `infrastructure`, `aws`
* **Description:** S3 버킷에 새로운 영상이 업로드(PutObject) 되었을 때, 향후 구축될 Step Functions를 트리거할 수 있도록 AWS EventBridge(또는 S3 Event Notifications)를 구성합니다.
* **Tasks (DoD):**
* [ ] Terraform 코드에 S3 버킷 이벤트 알림 설정 추가
* [ ] EventBridge 규칙 생성 (S3 PutObject 이벤트 감지)
* [ ] (임시) 이벤트 발생 시 CloudWatch Logs로 로그가 잘 찍히는지 연동 테스트



---

# 🎯 Epic 2: EKS 비전/오디오 분석 마이크로서비스 구축

### Issue 2.1: [ML] Audio Analyzer 컨테이너(FastAPI) 개발

* **Labels:** `ml`, `backend`
* **Description:** S3에 있는 영상을 받아 오디오를 추출하고, 딥페이크 음성 여부 확률(0.0~1.0)을 반환하는 가벼운 Python FastAPI 애플리케이션을 개발합니다.
* **Tasks (DoD):**
* [ ] Python FastAPI 보일러플레이트 세팅
* [ ] `ffmpeg-python` 등을 이용한 S3 영상 내 오디오 추출 로직 구현
* [ ] (임시) 더미 모델 확률 반환 로직 또는 오픈소스 오디오 탐지 모델(추론부) 연결
* [ ] Dockerfile 작성 및 로컬 빌드 테스트



### Issue 2.2: [ML] Video Analyzer 컨테이너(FastAPI) 개발

* **Labels:** `ml`, `backend`
* **Description:** S3 영상의 시공간 프레임 일관성을 분석하여 조작 여부 확률을 반환하는 Python FastAPI 애플리케이션을 개발합니다.
* **Tasks (DoD):**
* [ ] Python FastAPI 보일러플레이트 세팅
* [ ] S3 비디오 프레임 추출 로직 구현
* [ ] (임시) 더미 비전 모델 연동 또는 오픈소스 기반 모델(FakeSTormer 구조 참고) 추론부 연결
* [ ] Dockerfile 작성 및 로컬 빌드 테스트



### Issue 2.3: [Infra] Terraform EKS Spot 인스턴스 노드 그룹 구성

* **Labels:** `infrastructure`, `terraform`
* **Description:** ML 모델이 동작할 EKS 환경에 비용 최적화를 위한 Spot 인스턴스 전용 노드 그룹을 추가합니다.
* **Tasks (DoD):**
* [ ] `terraform/eks.tf` 수정하여 ML 전용 Managed Node Group 추가
* [ ] 해당 Node Group을 Spot Instance (예: g4dn 계열 또는 적절한 CPU)로 설정
* [ ] ML 워크로드만 이 노드 그룹에 뜨도록 Taint/Toleration 설정



### Issue 2.4: [Infra] KEDA 도입 및 Scale-to-Zero 설정

* **Labels:** `infrastructure`, `k8s`
* **Description:** EKS 클러스터에 KEDA를 설치하고, SQS 대기열(또는 HTTP 트래픽)에 따라 ML Pod들이 0개에서 N개로 자동 스케일링 되도록 설정합니다.
* **Tasks (DoD):**
* [ ] Terraform/Helm을 통해 EKS에 KEDA 설치
* [ ] Audio/Video Analyzer Pod에 대한 `ScaledObject` 매니페스트 작성
* [ ] 트래픽이 없을 때 Pod가 0개로 Scale-down 되는지 테스트



---

# 🎯 Epic 3: AWS Step Functions & Bedrock 오케스트레이션

### Issue 3.1: [AWS] 분석 병렬 처리 Step Functions 상태 머신 설계

* **Labels:** `aws`, `architecture`
* **Description:** S3 이벤트에 의해 트리거되며, 비디오/오디오/텍스트 분석을 병렬(Parallel)로 실행하는 Step Functions 워크플로우를 구성합니다.
* **Tasks (DoD):**
* [ ] Step Functions ASL(Amazon States Language) 작성
* [ ] `Parallel` 상태를 활용하여 3갈래 작업 정의 (EKS Audio 호출, EKS Video 호출, Bedrock 호출)
* [ ] Terraform을 통해 Step Functions 배포
* [ ] S3 EventBridge 이벤트가 Step Functions를 정상 트리거하도록 연결



### Issue 3.2: [AWS/ML] Amazon Transcribe & Bedrock 컨텍스트 분석 람다 개발

* **Labels:** `aws`, `ml`
* **Description:** Step Functions 내에서 실행될 Lambda 함수로, 영상을 Transcribe하여 텍스트로 바꾸고 Bedrock(Claude 3 등)에 프롬프트를 보내 컨텍스트 점수를 받아옵니다.
* **Tasks (DoD):**
* [ ] Python Lambda 함수 생성 (Transcribe Job 시작 및 대기 로직)
* [ ] Bedrock API 연동 및 피싱/스캠 판별 프롬프트 엔지니어링
* [ ] Bedrock이 반환한 응답에서 확률 점수 파싱 로직 구현



### Issue 3.3: [Backend] DB 상태 업데이트 처리 로직 구현 (비동기)

* **Labels:** `backend`, `database`
* **Description:** AWS Step Functions의 분석이 진행되거나 완료될 때마다 그 상태(진행 중, 성공, 실패)를 기존 PostgreSQL DB에 업데이트하는 로직을 구축합니다.
* **Tasks (DoD):**
* [ ] Go 백엔드에 Step Functions/Lambda로부터 콜백을 받을 수 있는 Webhook/API 엔드포인트 구현
* [ ] 상태값 저장을 위한 DB 테이블/스키마 업데이트
* [ ] 프론트엔드가 상태를 조회(Polling)할 수 있는 API 수정



---

# 🎯 Epic 4: 메타 러닝 앙상블 람다 (Meta-Learner Lambda) 구현

### Issue 4.1: [ML] 앙상블 메타 모델 학습 및 배포 준비

* **Labels:** `ml`
* **Description:** 3개의 점수(Bedrock, Audio, Video)를 입력받아 최종 '딥페이크 확률'을 계산하는 Random Forest/XGBoost 모델을 학습시킵니다.
* **Tasks (DoD):**
* [ ] Jupyter Notebook 환경에서 더미 데이터셋(3개 피처 + 라벨) 생성
* [ ] Scikit-learn 등을 이용해 단순 앙상블 모델 훈련
* [ ] 모델을 `.joblib` 형태로 추출



### Issue 4.2: [AWS] 최종 판독용 Meta-Learner Lambda 개발 및 연결

* **Labels:** `aws`, `ml`
* **Description:** Step Functions의 `Parallel` 작업이 끝난 후 실행되며, 각 결과를 종합하여 최종 딥페이크 확률을 계산하는 Lambda를 구현합니다.
* **Tasks (DoD):**
* [ ] Python Lambda 코드 작성 (Step Functions에서 3개의 점수 파라미터 수신)
* [ ] 4.1에서 만든 `.joblib` 모델을 Lambda (또는 Lambda Layer)에 탑재
* [ ] 모델 추론(`.predict_proba()`) 후 최종 점수를 도출하여 백엔드 DB 업데이트 호출
* [ ] Step Functions 워크플로우 마지막 단계에 이 Lambda 연결



---

# 🎯 Epic 5: UI/UX 고도화 (Frontend & Backend)

### Issue 5.1: [Backend] `analysis.proto` gRPC 스키마 확장

* **Labels:** `backend`, `grpc`
* **Description:** 메타 모델의 종합 점수뿐만 아니라, 오디오/비디오/컨텍스트 각각의 개별 점수를 프론트엔드에 전달할 수 있도록 스키마를 업데이트합니다.
* **Tasks (DoD):**
* [ ] `analysis.proto`의 `AnalysisResult` (또는 관련 메시지)에 `audio_score`, `video_score`, `context_score`, `final_score` 필드 추가
* [ ] 백엔드 Go 코드 재생성 및 리졸버 로직 업데이트



### Issue 5.2: [Frontend] 다중 모달 분석 대시보드 UI 구현

* **Labels:** `frontend`, `ui`
* **Description:** 단순 텍스트 결과창을 넘어, 3개의 모델 점수와 최종 점수를 시각적으로 보여주는 전문적인 대시보드 컴포넌트를 개발합니다.
* **Tasks (DoD):**
* [ ] Recharts 등을 활용하여 세 가지 지표를 보여주는 레이더 차트(Radar Chart) 컴포넌트 개발
* [ ] 최종 딥페이크 확률을 표시하는 원형 게이지바(Gauge bar) 컴포넌트 추가
* [ ] 각 점수가 의미하는 바를 설명하는 Tooltip 컴포넌트 적용
* [ ] 상태 진행률에 따른 실시간 분석 로딩 스피너(각 전문가별 분석 중 상태 표시) 추가

