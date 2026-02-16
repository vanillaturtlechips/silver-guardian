FROM --platform=linux/amd64 golang:1.24-alpine AS builder

ARG TARGETOS=linux
ARG TARGETARCH=amd64

RUN apk add --no-cache git tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# 디버깅: 파일 확인
RUN echo "=== Checking files ===" && \
    ls -la internal/app/ && \
    grep -c "gRPC-Web server" internal/app/app.go && \
    echo "File check passed"

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -a -installsuffix cgo -o main ./cmd/server/main.go

# 디버깅: 바이너리 확인
RUN echo "=== Checking binary ===" && \
    strings main | grep -i "gRPC-Web" && \
    echo "Binary check passed"

FROM --platform=linux/amd64 alpine:latest

RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg \
    python3 \
    py3-pip && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp

ENV PATH="/opt/venv/bin:$PATH" \
    TZ=Asia/Seoul \
    ENVIRONMENT=production

WORKDIR /app

RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

COPY --from=builder /app/main .
COPY --from=builder /app/config.yaml .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080 50051

CMD ["./main"]