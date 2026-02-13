# 🛡️ Silver Guardian (실버 가디언)

**어르신을 위한 AI 기반 딥페이크 및 금융 사기 탐지 솔루션**

Silver Guardian은 YouTube 영상의 메타데이터, 자막, 댓글을 분석하여 해당 영상이 딥페이크(Deepfake)이거나 금융 사기(Scam)일 확률을 실시간으로 진단하는 AI 모니터링 대시보드입니다. 어르신들이 안전하게 디지털 콘텐츠를 소비할 수 있도록 직관적인 UI와 쉬운 설명을 제공합니다.

## ✨ 주요 기능

* **📺 실시간 영상 분석:** YouTube URL만 입력하면 즉시 영상을 분석합니다.
* **🤖 AI 탐정 (Gemini Pro):** Google Gemini 2.0 Flash 모델을 활용하여 딥페이크, 보이스피싱, 사기성 투자 권유를 탐지합니다.
* **🚦 직관적인 결과 리포트:** 어르신들을 위해 안전/주의/위험 3단계 신호등 UI와 큰 글씨로 결과를 보여줍니다.
* **📝 3줄 요약:** 복잡한 기술 용어 대신, 이해하기 쉬운 한국어로 핵심 사유를 요약해 줍니다.
* **⚡ gRPC 스트리밍:** 실시간 분석 진행 상황을 끊김 없이 시각화합니다.

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
* **Framework:** React, TypeScript, Vite
* **UI Library:** Tailwind CSS, Shadcn UI, Lucide React
* **State Management:** Context API (Global State)
* **Communication:** gRPC-Web

### Backend
* **Language:** Go (Golang)
* **Communication:** gRPC
* **Database:** PostgreSQL (with `pgx`)
* **AI Model:** Google Gemini 2.0 Flash
* **External API:** YouTube Data API v3

### Infrastructure
* **Container:** Docker, Docker Compose
* **IaC:** Terraform (AWS EKS, VPC)

---

## 🚀 실행 방법 (Quick Start)

### 1. 사전 준비 (Prerequisites)

* [Go](https://go.dev/) (1.21+)
* [Node.js](https://nodejs.org/) (18+)
* [Docker](https://www.docker.com/)
* **API Keys:**
    * `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/)
    * `YOUTUBE_API_KEY`: [Google Cloud Console](https://console.cloud.google.com/)

### 2. 환경 변수 설정

`backend/.env` 파일을 생성하고 아래 내용을 입력하세요.

```bash
# Server
GRPC_PORT=50051
ENVIRONMENT=development

# Database (Docker Compose 설정과 일치)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=silver_guardian

# API Keys
GEMINI_API_KEY=your_gemini_key
YOUTUBE_API_KEY=your_youtube_key