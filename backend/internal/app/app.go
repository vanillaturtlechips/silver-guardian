package app

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

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
	pgStore     *storage.PostgresStore
	redisClient *redis.Client // Redis 클라이언트
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
	defer a.cleanup() // 종료 시 리소스 정리

	// 3. 외부 서비스 클라이언트 초기화 (YouTube, Gemini)
	ytClient := youtube.NewClient(a.cfg.YouTube.APIKey)

	ctx := context.Background()
	geminiClient, err := gemini.NewClient(ctx, a.cfg.Gemini.APIKey, a.cfg.Gemini.Model)
	if err != nil {
		return fmt.Errorf("failed to create Gemini client: %w", err)
	}
	defer geminiClient.Close()

	// 4. 워커(Analyzer) 초기화
	// [수정 완료] Redis 클라이언트(a.redisClient)를 추가로 전달합니다.
	analyzer := worker.NewAnalyzer(ytClient, geminiClient, a.pgStore, a.redisClient)

	// 5. gRPC 서버 설정
	a.initGRPCServer(analyzer)

	// 6. 서버 시작 및 우아한 종료(Graceful Shutdown) 대기
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
		// Redis가 필수라면 여기서 에러 리턴, 선택사항이라면 로그만 찍고 진행
		// 여기서는 세션 공유를 위해 필수이므로 에러 리턴
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
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", a.cfg.Server.GRPCPort))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	// 서버 실행 고루틴
	go func() {
		log.Printf("gRPC server listening on port %d", a.cfg.Server.GRPCPort)
		if err := a.grpcServer.Serve(listener); err != nil {
			log.Fatalf("Failed to serve: %v", err)
		}
	}()

	// 종료 시그널 대기
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("Shutting down gracefully...")
	a.grpcServer.GracefulStop()
	log.Printf("Server stopped")

	return nil
}

// 리소스 정리 (DB 연결 종료 등)
func (a *App) cleanup() {
	if a.pgStore != nil {
		a.pgStore.Close()
	}
	if a.redisClient != nil {
		a.redisClient.Close()
	}
}