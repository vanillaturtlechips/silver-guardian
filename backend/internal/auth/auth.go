package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/idtoken"
)

var jwtSecret = []byte("YOUR_SECRET_KEY_CHANGE_ME") // TODO: Config에서 로드

type Claims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// 1. Google ID Token 검증
func VerifyGoogleToken(ctx context.Context, tokenString string, clientID string) (*idtoken.Payload, error) {
	payload, err := idtoken.Validate(ctx, tokenString, clientID)
	if err != nil {
		return nil, err
	}
	return payload, nil
}

// 2. JWT 발급 (우리 서버용)
func GenerateJWT(userID int64, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 1일 유효
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// 3. JWT 검증
func ValidateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}