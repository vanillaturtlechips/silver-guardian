# S3 버킷 생성
resource "aws_s3_bucket" "uploads" {
  bucket = "silver-guardian-uploads"

  tags = {
    Name        = "Silver Guardian Uploads"
    Environment = "production"
    Project     = "silver-guardian"
  }
}

# S3 버킷 버저닝 활성화
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 버킷 CORS 설정
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["http://localhost:5173", "http://localhost:3000", "https://*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3 버킷 암호화 설정
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 버킷 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# EventBridge로 이벤트 전송 활성화
resource "aws_s3_bucket_notification" "uploads_notification" {
  bucket      = aws_s3_bucket.uploads.id
  eventbridge = true
}
