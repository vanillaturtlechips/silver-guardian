# 1단계: 빌드 스테이지
FROM golang:1.24-alpine AS builder

# 빌드에 필요한 도구 설치
RUN apk add --no-cache git tzdata

WORKDIR /app

# 의존성 설치 (레이어 캐싱 활용)
COPY go.mod go.sum ./
RUN go mod download

# 소스 전체 복사 및 바이너리 빌드
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# 2단계: 실행 스테이지
FROM alpine:latest

# 런타임에 필요한 의존성 설치 (유튜브 분석용)
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg \
    python3 \
    py3-pip && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp

# 환경 변수 및 경로 설정
ENV PATH="/opt/venv/bin:$PATH" \
    TZ=Asia/Seoul \
    ENVIRONMENT=production

WORKDIR /app

# 보안을 위한 비관리자 계정 생성 및 권한 부여
RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 빌드 스테이지에서 필요한 파일만 복사
COPY --from=builder /app/main .
COPY --from=builder /app/config.yaml .
COPY --from=builder /app/migrations ./migrations

# gRPC(50051)와 HTTP(8080) 포트 노출
EXPOSE 8080 50051

CMD ["./main"]