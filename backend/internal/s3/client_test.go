package s3

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGeneratePresignedURL(t *testing.T) {
	ctx := context.Background()

	// 실제 AWS 자격 증명이 필요하므로 통합 테스트로 분류
	// CI/CD에서는 스킵하거나 Mock을 사용할 수 있습니다
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	client, err := NewClient(ctx, "test-bucket", "ap-northeast-2")
	assert.NoError(t, err)
	assert.NotNil(t, client)

	req := PresignedURLRequest{
		Filename:    "test-video.mp4",
		ContentType: "video/mp4",
		FileSize:    1024000,
		UserID:      "test-user-123",
	}

	resp, err := client.GeneratePresignedURL(ctx, req)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.UploadURL)
	assert.NotEmpty(t, resp.S3Key)
	assert.Equal(t, int32(900), resp.ExpiresIn) // 15분 = 900초
	assert.NotEmpty(t, resp.UploadID)

	// S3 키 형식 검증
	assert.Contains(t, resp.S3Key, "uploads/test-user-123/")
	assert.Contains(t, resp.S3Key, "test-video.mp4")
}

func TestPresignedURLFormat(t *testing.T) {
	// URL 형식 검증을 위한 단위 테스트
	// 실제 AWS 호출 없이 로직만 테스트
	ctx := context.Background()

	client, err := NewClient(ctx, "test-bucket", "ap-northeast-2")
	if err != nil {
		t.Skip("AWS credentials not available")
	}

	req := PresignedURLRequest{
		Filename:    "sample.mp4",
		ContentType: "video/mp4",
		FileSize:    5000000,
		UserID:      "user-456",
	}

	resp, err := client.GeneratePresignedURL(ctx, req)
	if err != nil {
		t.Skip("AWS API call failed (expected in CI)")
	}

	// URL이 HTTPS로 시작하는지 확인
	assert.Contains(t, resp.UploadURL, "https://")
	
	// S3 버킷 이름이 포함되어 있는지 확인
	assert.Contains(t, resp.UploadURL, "test-bucket")
}
