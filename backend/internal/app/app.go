package app

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/vanillaturtlechips/silver-guardian/backend/internal/config"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/gemini"
	grpcHandler "github.com/vanillaturtlechips/silver-guardian/backend/internal/grpc"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/storage"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/worker"
	"github.com/vanillaturtlechips/silver-guardian/backend/internal/youtube"
	pb "github.com/vanillaturtlechips/silver-guardian/backend/proto"

	"net/http"
	"github.com/improbable-eng/grpc-web/go/grpcweb"

)

type App struct {
	cfg        *config.Config
	grpcServer *grpc.Server
	store      *storage.PostgresStore
	redis      *redis.Client
	listener   net.Listener
}

// New initializes the application
func New(configPath, env string) (*App, error) {
	// 1. Config 로드
	cfg, err := config.Load(configPath)
	if err != nil {
		return nil, fmt.Errorf("config load failed: %w", err)
	}
	// config.yaml에 env가 없으면 코드에서 주입
	if cfg.Server.Env == "" {
		// ServerConfig 구조체에 Env 필드가 없다면 이 줄은 제거하거나 무시해도 됩니다.
		// (사용자분의 config.go에는 Env 필드가 없을 수도 있음)
	}

	log.Printf("Initializing App (Env: %s)", env)

	// 2. DB 연결 (PostgreSQL)
	// config.go의 DSN() 메소드 활용
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.Name, cfg.Database.SSLMode)

	store, err := storage.NewPostgresStore(dsn, 25, 25)
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	// 3. Redis 연결
	// config.yaml에 값이 없으면 기본값 사용
	redisHost := cfg.Redis.Host
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := cfg.Redis.Port
	if redisPort == 0 {
		redisPort = 6379
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%d", redisHost, redisPort),
		DB:   cfg.Redis.DB,
	})

	// 4. 외부 클라이언트 초기화
	// YouTube
	ytClient := youtube.NewClient(cfg.YouTube.APIKey)

	// Gemini
	geminiClient, err := gemini.NewClient(context.Background(), cfg.Gemini.APIKey, "gemini-2.0-flash")
	if err != nil {
		return nil, fmt.Errorf("gemini client init failed: %w", err)
	}

	// 5. Worker (Analyzer) 초기화
	// 이제 타입이 정확히 맞습니다 (*youtube.Client, *gemini.Client, *storage.PostgresStore, *redis.Client)
	analyzer := worker.NewAnalyzer(ytClient, geminiClient, store, rdb)

	// 6. gRPC 서버 설정
	port := cfg.Server.GRPCPort
	if port == 0 {
		port = 50051 // 기본값
	}
	
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return nil, fmt.Errorf("failed to listen on port %d: %w", port, err)
	}

	grpcServer := grpc.NewServer()
	analysisHandler := grpcHandler.NewAnalysisServer(store, analyzer)
	pb.RegisterAnalysisServiceServer(grpcServer, analysisHandler)
	reflection.Register(grpcServer)

	return &App{
		cfg:        cfg,
		grpcServer: grpcServer,
		store:      store,
		redis:      rdb,
		listener:   lis,
	}, nil
}

// Run starts the gRPC server
func (a *App) Run() error {
    wrappedGrpc := grpcweb.WrapServer(a.grpcServer,
        grpcweb.WithOriginFunc(func(origin string) bool { return true }),
    )

    httpServer := &http.Server{
        Addr: ":8080",
        Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            wrappedGrpc.ServeHTTP(w, r)
        }),
    }

    go func() {
        log.Printf("gRPC-Web server (HTTP) listening on port 8080")
        if err := httpServer.ListenAndServe(); err != nil {
            log.Fatalf("gRPC-Web server failed: %v", err)
        }
    }()

    log.Printf("Starting gRPC server on port :%d", a.cfg.Server.GRPCPort)
    return a.grpcServer.Serve(a.listener)
}

// Stop cleans up resources
func (a *App) Stop() {
	a.grpcServer.GracefulStop()
	if a.store != nil {
		a.store.Close()
	}
	if a.redis != nil {
		a.redis.Close()
	}
}