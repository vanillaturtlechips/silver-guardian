package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"

    pb "github.com/your-org/silver-guardian/backend/proto"
    "github.com/your-org/silver-guardian/backend/internal/config"
    "github.com/your-org/silver-guardian/backend/internal/gemini"
    grpcHandler "github.com/your-org/silver-guardian/backend/internal/grpc"
    "github.com/your-org/silver-guardian/backend/internal/storage"
    "github.com/your-org/silver-guardian/backend/internal/worker"
    "github.com/your-org/silver-guardian/backend/internal/youtube"

    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

func main() {
    if err := run(); err != nil {
        log.Fatalf("Application failed: %v", err)
    }
}

func run() error {
    // Load configuration
    cfg, err := config.Load("config.yaml")
    if err != nil {
        return fmt.Errorf("failed to load config: %w", err)
    }

    log.Printf("Starting Silver Guardian Backend...")
    log.Printf("Environment: %s", os.Getenv("ENV"))

    // Initialize PostgreSQL
    log.Printf("Connecting to PostgreSQL at %s:%d...", cfg.Database.Host, cfg.Database.Port)
    store, err := storage.NewPostgresStore(
        cfg.Database.DSN(),
        cfg.Database.MaxConnections,
        cfg.Database.MaxIdleConnections,
    )
    if err != nil {
        return fmt.Errorf("failed to connect to database: %w", err)
    }
    defer store.Close()
    log.Printf("PostgreSQL connected successfully")

    // Initialize YouTube client
    if cfg.YouTube.APIKey == "" {
        log.Printf("WARNING: YouTube API key not set, some features may not work")
    }
    youtubeClient := youtube.NewClient(cfg.YouTube.APIKey)
    log.Printf("YouTube client initialized")

    // Initialize Gemini client
    ctx := context.Background()
    if cfg.Gemini.APIKey == "" {
        return fmt.Errorf("Gemini API key is required")
    }
    geminiClient, err := gemini.NewClient(ctx, cfg.Gemini.APIKey, cfg.Gemini.Model)
    if err != nil {
        return fmt.Errorf("failed to create Gemini client: %w", err)
    }
    defer geminiClient.Close()
    log.Printf("Gemini client initialized (model: %s)", cfg.Gemini.Model)

    // Initialize analyzer
    analyzer := worker.NewAnalyzer(youtubeClient, geminiClient, store)
    log.Printf("Analyzer initialized")

    // Initialize gRPC server
    grpcServer := grpc.NewServer(
        grpc.MaxRecvMsgSize(10 * 1024 * 1024), // 10MB
        grpc.MaxSendMsgSize(10 * 1024 * 1024),
    )

    analysisServer := grpcHandler.NewAnalysisServer(store, analyzer)
    pb.RegisterAnalysisServiceServer(grpcServer, analysisServer)

    // Enable reflection for grpcurl
    reflection.Register(grpcServer)

    // Start gRPC server
    listener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.GRPCPort))
    if err != nil {
        return fmt.Errorf("failed to listen: %w", err)
    }

    go func() {
        log.Printf("gRPC server listening on port %d", cfg.Server.GRPCPort)
        if err := grpcServer.Serve(listener); err != nil {
            log.Fatalf("Failed to serve: %v", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Printf("Shutting down gracefully...")
    grpcServer.GracefulStop()
    log.Printf("Server stopped")

    return nil
}