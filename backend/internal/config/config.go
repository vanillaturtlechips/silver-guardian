package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Redis    RedisConfig    `yaml:"redis"`    // [복구] Redis 필드 추가
	YouTube  YouTubeConfig  `yaml:"youtube"`
	Gemini   GeminiConfig   `yaml:"gemini"`
}

type ServerConfig struct {
	GRPCPort int    `yaml:"grpc_port"` // [수정] Port -> GRPCPort (app.go와 일치)
	Env      string `yaml:"env"`
}

type DatabaseConfig struct {
	Host               string `yaml:"host"`
	Port               int    `yaml:"port"`
	Name               string `yaml:"name"`
	User               string `yaml:"user"`
	Password           string `yaml:"password"`
	SSLMode            string `yaml:"sslmode"`
	MaxConnections     int    `yaml:"max_connections"`
	MaxIdleConnections int    `yaml:"max_idle_connections"`
}

type RedisConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
	DB   int    `yaml:"db"`
}

type YouTubeConfig struct {
	APIKey string `yaml:"api_key"`
}

type GeminiConfig struct {
	APIKey string `yaml:"api_key"`
	Model  string `yaml:"model"`
}

// Load loads config from path
func Load(path string) (*Config, error) {
	// 1. .env 로드
	_ = godotenv.Load()

	// 2. YAML 파일 읽기
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// 3. 환경변수 치환
	expanded := os.ExpandEnv(string(data))

	// 4. 파싱
	var cfg Config
	if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	return &cfg, nil
}