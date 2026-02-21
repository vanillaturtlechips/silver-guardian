# Epic 1.1: S3 Presigned URL 발급 gRPC API 구현

## ✅ 완료된 작업 (DoD)

### 1. AWS SDK for Go (v2) 연동
- ✅ `github.com/aws/aws-sdk-go-v2/config` 추가
- ✅ `github.com/aws/aws-sdk-go-v2/service/s3` 추가
- ✅ `go.mod` 업데이트 완료

### 2. `analysis.proto`에 Presigned URL 요청/응답 메시지 정의
- ✅ `UploadURLRequest` 메시지 추가
  - `filename`: 업로드할 파일명
  - `content_type`: MIME 타입
  - `file_size`: 파일 크기 (바이트)
  - `user_id`: 업로드하는 사용자 ID
- ✅ `UploadURLResponse` 메시지 추가
  - `upload_url`: S3 Presigned URL
  - `s3_key`: S3 객체 키 (경로)
  - `expires_in`: URL 만료 시간 (초)
  - `upload_id`: 추적용 고유 ID
- ✅ `GetUploadURL` RPC 메서드 추가

### 3. S3 PutObject Presigned URL 생성 로직 구현
- ✅ `internal/s3/client.go` 생성
  - `NewClient()`: S3 클라이언트 초기화
  - `GeneratePresignedURL()`: Presigned URL 생성
  - 만료 시간: 15분 (900초)
  - S3 키 형식: `uploads/{user_id}/{upload_id}/{filename}`
- ✅ `internal/grpc/handler.go`에 `GetUploadURL()` 핸들러 구현
- ✅ `internal/app/app.go`에 S3 클라이언트 초기화 로직 추가
- ✅ 환경변수 설정 (`.env`)
  - `AWS_REGION=ap-northeast-2`
  - `S3_BUCKET_NAME=silver-guardian-uploads`

### 4. 단위 테스트 작성
- ✅ `internal/s3/client_test.go` 생성
  - `TestGeneratePresignedURL`: 통합 테스트 (실제 AWS 호출)
  - `TestPresignedURLFormat`: URL 형식 검증
- ✅ 테스트 실행 성공

## 📁 생성/수정된 파일

```
backend/
├── proto/analysis.proto                    # 수정: RPC 및 메시지 추가
├── internal/
│   ├── s3/
│   │   ├── client.go                       # 신규: S3 클라이언트
│   │   └── client_test.go                  # 신규: 단위 테스트
│   ├── grpc/handler.go                     # 수정: GetUploadURL 핸들러 추가
│   └── app/app.go                          # 수정: S3 클라이언트 초기화
├── .env                                    # 수정: AWS 설정 추가
└── go.mod                                  # 수정: AWS SDK 의존성 추가
```

## 🧪 테스트 방법

### 1. 로컬 테스트
```bash
cd backend
go test ./internal/s3/... -v
```

### 2. grpcurl을 통한 API 테스트
```bash
grpcurl -plaintext -d '{
  "filename": "test-video.mp4",
  "content_type": "video/mp4",
  "file_size": 5242880,
  "user_id": "test-user-123"
}' localhost:50051 analysis.AnalysisService/GetUploadURL
```

### 3. 예상 응답
```json
{
  "upload_url": "https://silver-guardian-uploads.s3.ap-northeast-2.amazonaws.com/uploads/test-user-123/...",
  "s3_key": "uploads/test-user-123/uuid/test-video.mp4",
  "expires_in": 900,
  "upload_id": "uuid-string"
}
```

## 🔐 보안 고려사항

1. **Presigned URL 만료 시간**: 15분으로 설정하여 보안 위험 최소화
2. **S3 키 구조**: 사용자 ID별로 디렉토리 분리하여 격리
3. **Content-Type 검증**: 클라이언트가 올바른 MIME 타입을 전달하도록 강제
4. **AWS 자격 증명**: 환경변수 또는 IAM Role을 통해 관리 (코드에 하드코딩 금지)

## 📝 다음 단계 (Epic 1.2)

- [ ] 프론트엔드에서 Drag & Drop 파일 업로드 UI 구현
- [ ] gRPC-web을 통해 `GetUploadURL` 호출
- [ ] 발급받은 Presigned URL로 S3에 직접 업로드
- [ ] 업로드 진행률 표시

## 🎉 완료!

Epic 1.1의 모든 DoD가 충족되었습니다. 백엔드는 이제 S3 Presigned URL을 발급할 준비가 완료되었습니다.
