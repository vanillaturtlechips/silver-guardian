# 빌드 단계
FROM golang:1.24-alpine AS builder
WORKDIR /app

# 의존성 설치 (캐시 활용을 위해 먼저 복사)
COPY go.mod go.sum ./
RUN go mod download

# 소스 코드 복사 및 빌드
COPY . .
RUN go build -o main ./cmd/server/main.go

# 실행 단계
FROM alpine:latest
WORKDIR /app

# 빌드된 바이너리와 설정 파일 복사
COPY --from=builder /app/main .
COPY --from=builder /app/config.yaml .
# 만약 마이그레이션 파일이 실행 시 필요하다면 추가
COPY --from=builder /app/migrations ./migrations 

EXPOSE 8080
CMD ["./main"]