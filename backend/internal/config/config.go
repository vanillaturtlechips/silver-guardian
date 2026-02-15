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
    Redis    RedisConfig    `yaml:"redis"`
    YouTube  YouTubeConfig  `yaml:"youtube"`
    Gemini   GeminiConfig   `yaml:"gemini"`
    Worker   WorkerConfig   `yaml:"worker"`
    Logging  LoggingConfig  `yaml:"logging"`
}

type ServerConfig struct {
    GRPCPort int `yaml:"grpc_port"`
    HTTPPort int `yaml:"http_port"`
}

type DatabaseConfig struct {
    Host               string `yaml:"host"`
    Port               int    `yaml:"port"`
    Name               string `yaml:"name"`
    User               string `yaml:"user"`
    Password           string `yaml:"password"`
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
    APIKey      string  `yaml:"api_key"`
    Model       string  `yaml:"model"`
    Temperature float32 `yaml:"temperature"`
    MaxTokens   int     `yaml:"max_tokens"`
}

type WorkerConfig struct {
    PoolSize       int `yaml:"pool_size"`
    MaxRetries     int `yaml:"max_retries"`
    TimeoutSeconds int `yaml:"timeout_seconds"`
}

type LoggingConfig struct {
    Level  string `yaml:"level"`
    Format string `yaml:"format"`
}

func Load(path string) (*Config, error) {
    // Load .env file
    _ = godotenv.Load()

    // Read YAML config
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read config file: %w", err)
    }

    // Expand environment variables
    expanded := os.ExpandEnv(string(data))

    var cfg Config
    if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
        return nil, fmt.Errorf("failed to parse config: %w", err)
    }

    return &cfg, nil
}

func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
        c.Host, c.Port, c.User, c.Password, c.Name,
    )
}