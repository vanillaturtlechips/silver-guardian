package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestJWTFlow(t *testing.T) {
	// 1. 테스트용 데이터
	userID := int64(123)
	email := "test@example.com"

	// 2. JWT 생성 테스트
	tokenString, err := GenerateJWT(userID, email)
	assert.NoError(t, err)
	assert.NotEmpty(t, tokenString)

	// 3. JWT 검증 테스트
	claims, err := ValidateJWT(tokenString)
	assert.NoError(t, err)
	assert.NotNil(t, claims)

	// 4. 내용 일치 확인
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
}

func TestInvalidJWT(t *testing.T) {
	// 잘못된 토큰 검증
	_, err := ValidateJWT("invalid-token-string")
	assert.Error(t, err)
}