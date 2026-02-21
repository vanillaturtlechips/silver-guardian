# CloudWatch Logs 그룹 생성 (테스트용)
resource "aws_cloudwatch_log_group" "s3_events" {
  name              = "/aws/events/silver-guardian-s3-uploads"
  retention_in_days = 7

  tags = {
    Name    = "Silver Guardian S3 Events"
    Project = "silver-guardian"
  }
}

# EventBridge 규칙: S3 PutObject 이벤트 감지
resource "aws_cloudwatch_event_rule" "s3_upload" {
  name        = "silver-guardian-s3-upload"
  description = "Capture S3 PutObject events for video uploads"

  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = {
        name = [aws_s3_bucket.uploads.id]
      }
      object = {
        key = [{
          prefix = "uploads/"
        }]
      }
    }
  })

  tags = {
    Name    = "Silver Guardian S3 Upload Rule"
    Project = "silver-guardian"
  }
}

# CloudWatch Logs 타겟 (테스트용)
resource "aws_cloudwatch_event_target" "s3_upload_to_logs" {
  rule      = aws_cloudwatch_event_rule.s3_upload.name
  target_id = "SendToCloudWatchLogs"
  arn       = aws_cloudwatch_log_group.s3_events.arn
}

# CloudWatch Logs에 쓰기 권한 부여
resource "aws_cloudwatch_log_resource_policy" "eventbridge_logs" {
  policy_name = "silver-guardian-eventbridge-logs-policy"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.s3_events.arn}:*"
      }
    ]
  })
}
