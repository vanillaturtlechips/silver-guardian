package main

import (
    "log"
    "os"

    "github.com/your-org/silver-guardian/backend/internal/app"
)

func main() {
    // 환경변수 확인 (선택사항)
    env := os.Getenv("ENV")
    if env == "" {
        env = "development"
    }

    // 애플리케이션 초기화 및 실행
    // 설정 파일 경로는 실행 인자나 환경변수로 받을 수도 있지만, 여기선 고정값 사용
    application := app.New("config.yaml", env)
    
    if err := application.Run(); err != nil {
        log.Fatalf("Application failed to start: %v", err)
    }
}