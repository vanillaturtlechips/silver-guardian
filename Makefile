.PHONY: help proto build run docker-up docker-down test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

proto: ## Generate protobuf code
	@echo "Generating protobuf code..."
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/analysis.proto

deps: ## Install dependencies
	@echo "Installing Go dependencies..."
	go mod download
	go mod tidy

build: ## Build the server
	@echo "Building server..."
	go build -o bin/server cmd/server/main.go

run: ## Run the server locally
	@echo "Starting server..."
	go run cmd/server/main.go

docker-up: ## Start Docker services (PostgreSQL, Redis)
	@echo "Starting Docker services..."
	docker compose up -d
	@echo "Waiting for PostgreSQL to be ready..."
	sleep 5

docker-down: ## Stop Docker services
	@echo "Stopping Docker services..."
	docker compose down

docker-logs: ## Show Docker logs
	docker compose logs -f

test: ## Run tests
	@echo "Running tests..."
	go test -v ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf bin/
	go clean

db-migrate: docker-up ## Run database migrations
	@echo "Database migrations already run via docker-entrypoint-initdb.d"

grpcurl-test: ## Test with grpcurl
	@echo "Testing StartAnalysis..."
	grpcurl -plaintext -d '{"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
		localhost:50051 analysis.AnalysisService/StartAnalysis

install-tools: ## Install development tools
	@echo "Installing protoc plugins..."
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	@echo "Installing grpcurl..."
	go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
	@echo "Installing yt-dlp..."
	@echo "Please install yt-dlp manually: pip install yt-dlp"

dev: docker-up proto deps build run ## Full development setup

.DEFAULT_GOAL := help