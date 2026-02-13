# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make protobuf-dev

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN go build -o /app/bin/server cmd/server/main.go

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates python3 py3-pip ffmpeg && \
    pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Copy binary
COPY --from=builder /app/bin/server /app/server

# Copy config
COPY config.yaml /app/config.yaml

# Expose gRPC port
EXPOSE 50051

# Run
CMD ["/app/server"]
```

---

## 1️⃣7️⃣ .dockerignore
```
.git
.env
bin/
*.log
.vscode/
.idea/
*.test
coverage.*