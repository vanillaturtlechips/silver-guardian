package app

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/your-org/silver-guardian/backend/internal/config"
	"github.com/your-org/silver-guardian/backend/internal/gemini"
	grpcHandler "github.com/your-org/silver-guardian/backend/internal/grpc"
	"github.com/your-org/silver-guardian/backend/internal/storage"
	"github.com/your-org/silver-guardian/backend/internal/worker"
	"github.com/your-org/silver-guardian/backend/internal/youtube"
	pb "github.com/your-org/silver-guardian/backend/proto"
)

// App 구조체는 애플리케이션의 의존성들을 관리합니다.
type App struct {
	cfg         *config.Config
	grpcServer  *grpc.Server
	httpServer  *http.Server
	pgStore     *storage.PostgresStore
	redisClient *redis.Client
	env         string
	configPath  string
}

// New 함수는 App 인스턴스를 생성합니다.
func New(configPath, env string) *App {
	return &App{
		configPath: configPath,
		env:        env,
	}
}

// Run 함수는 전체 초기화 과정을 수행하고 서버를 시작합니다.
func (a *App) Run() error {
	var err error

	// 1. 설정 로드
	a.cfg, err = config.Load(a.configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}
	log.Printf("Starting Silver Guardian Backend (Env: %s)", a.env)

	// 2. 인프라 초기화 (DB, Redis)
	if err := a.initInfrastructure(); err != nil {
		return err
	}
	defer a.cleanup()

	// 3. 외부 서비스 클라이언트 초기화 (YouTube, Gemini)
	ytClient := youtube.NewClient(a.cfg.YouTube.APIKey)

	ctx := context.Background()
	geminiClient, err := gemini.NewClient(ctx, a.cfg.Gemini.APIKey, a.cfg.Gemini.Model)
	if err != nil {
		return fmt.Errorf("failed to create Gemini client: %w", err)
	}
	defer geminiClient.Close()

	// 4. 워커(Analyzer) 초기화
	analyzer := worker.NewAnalyzer(ytClient, geminiClient, a.pgStore, a.redisClient)

	// 5. gRPC 서버 설정
	a.initGRPCServer(analyzer)

	// 6. 서버 시작 및 우아한 종료 대기
	return a.startServer()
}

func (a *App) initInfrastructure() error {
	// PostgreSQL 연결
	log.Printf("Connecting to PostgreSQL...")
	store, err := storage.NewPostgresStore(
		a.cfg.Database.DSN(),
		a.cfg.Database.MaxConnections,
		a.cfg.Database.MaxIdleConnections,
	)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	a.pgStore = store
	log.Printf("PostgreSQL connected.")

	// Redis 연결
	log.Printf("Connecting to Redis at %s:%d...", a.cfg.Redis.Host, a.cfg.Redis.Port)
	a.redisClient = redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%d", a.cfg.Redis.Host, a.cfg.Redis.Port),
		DB:   a.cfg.Redis.DB,
	})

	// Redis Ping 테스트
	if err := a.redisClient.Ping(context.Background()).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}
	log.Printf("Redis connected.")

	return nil
}

func (a *App) initGRPCServer(analyzer *worker.Analyzer) {
	a.grpcServer = grpc.NewServer(
		grpc.MaxRecvMsgSize(10*1024*1024), // 10MB
		grpc.MaxSendMsgSize(10*1024*1024),
	)

	analysisServer := grpcHandler.NewAnalysisServer(a.pgStore, analyzer)
	pb.RegisterAnalysisServiceServer(a.grpcServer, analysisServer)
	reflection.Register(a.grpcServer)
}

func (a *App) startServer() error {
	// 1. 순수 gRPC 서버 (내부/서버 간 통신용)
	grpcListener, err := net.Listen("tcp", fmt.Sprintf(":%d", a.cfg.Server.GRPCPort))
	if err != nil {
		return fmt.Errorf("failed to listen on gRPC port: %w", err)
	}

	// 2. gRPC-Web 래퍼 (브라우저용)
	wrappedGrpc := grpcweb.WrapServer(a.grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return origin == "https://silver-guardian.site" || 
			       origin == "http://localhost:5173"
		}),
		grpcweb.WithAllowedRequestHeaders([]string{
			"Content-Type",
			"X-Grpc-Web",
			"Grpc-Timeout",
		}),
	)

	// 3. HTTP 서버 설정 (gRPC-Web + CORS)
	a.httpServer = &http.Server{
		Addr: fmt.Sprintf(":%d", a.cfg.Server.HTTPPort),
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// CORS 헤더 설정
			origin := r.Header.Get("Origin")
			if origin == "https://silver-guardian.site" || origin == "http://localhost:5173" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Grpc-Web, Grpc-Timeout, X-User-Agent")
				w.Header().Set("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message, Grpc-Encoding, Grpc-Accept-Encoding")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			// OPTIONS preflight 요청 처리
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			// gRPC-Web 요청 처리
			if wrappedGrpc.IsGrpcWebRequest(r) {
				wrappedGrpc.ServeHTTP(w, r)
				return
			}
			
			// gRPC-Web 요청이 아니면 404
			http.NotFound(w, r)
		}),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// 4. 순수 gRPC 서버 시작
	go func() {
		log.Printf("gRPC server (native) listening on port %d", a.cfg.Server.GRPCPort)
		if err := a.grpcServer.Serve(grpcListener); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	// 5. HTTP/gRPC-Web 서버 시작
	go func() {
		log.Printf("gRPC-Web server (HTTP) listening on port %d", a.cfg.Server.HTTPPort)
		if err := a.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to serve gRPC-Web: %v", err)
		}
	}()

	// 6. 종료 시그널 대기
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("Shutting down gracefully...")

	// HTTP 서버 종료
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := a.httpServer.Shutdown(ctx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	// gRPC 서버 종료
	a.grpcServer.GracefulStop()
	log.Printf("Servers stopped")

	return nil
}

// 리소스 정리
func (a *App) cleanup() {
	if a.pgStore != nil {
		a.pgStore.Close()
	}
	if a.redisClient != nil {
		a.redisClient.Close()
	}
}