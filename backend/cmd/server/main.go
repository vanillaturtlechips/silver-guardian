package main

import (
	"log"
	"os"

	"github.com/vanillaturtlechips/silver-guardian/backend/internal/app"
)

func main() {
	// 환경변수 확인 (기본값 development)
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	// 애플리케이션 초기화 (Config 로드 -> DB 연결 -> 컴포넌트 조립)
	// config.yaml 파일이 루트 혹은 실행 위치에 있어야 합니다.
	application, err := app.New("config.yaml", env)
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	// 서버 실행
	if err := application.Run(); err != nil {
		log.Fatalf("Application failed to start: %v", err)
	}
}