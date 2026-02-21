# Lambda 실행 Role
resource "aws_iam_role" "transcribe_bedrock_lambda_role" {
  name = "silver-guardian-transcribe-bedrock-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name    = "Silver Guardian Transcribe Bedrock Lambda Role"
    Project = "silver-guardian"
  }
}

# Lambda Policy
resource "aws_iam_role_policy" "transcribe_bedrock_lambda_policy" {
  name = "silver-guardian-transcribe-bedrock-lambda-policy"
  role = aws_iam_role.transcribe_bedrock_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:DeleteTranscriptionJob"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:*:*:model/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda 함수 패키징
data "archive_file" "transcribe_bedrock_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/transcribe-bedrock-analyzer"
  output_path = "${path.module}/../lambda/transcribe-bedrock-analyzer.zip"
}

# Lambda 함수
resource "aws_lambda_function" "transcribe_bedrock_analyzer" {
  filename         = data.archive_file.transcribe_bedrock_lambda.output_path
  function_name    = "silver-guardian-transcribe-bedrock-analyzer"
  role            = aws_iam_role.transcribe_bedrock_lambda_role.arn
  handler         = "lambda_function.lambda_handler"
  source_code_hash = data.archive_file.transcribe_bedrock_lambda.output_base64sha256
  runtime         = "python3.11"
  timeout         = 600  # 10분 (Transcribe 대기 시간 포함)
  memory_size     = 512

  environment {
    variables = {
      REGION = "ap-northeast-2"
    }
  }

  tags = {
    Name        = "Silver Guardian Transcribe Bedrock Analyzer"
    Project     = "silver-guardian"
    Environment = "production"
  }
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "transcribe_bedrock_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.transcribe_bedrock_analyzer.function_name}"
  retention_in_days = 7

  tags = {
    Name    = "Silver Guardian Transcribe Bedrock Lambda Logs"
    Project = "silver-guardian"
  }
}

# Output
output "transcribe_bedrock_lambda_arn" {
  description = "Transcribe Bedrock Lambda Function ARN"
  value       = aws_lambda_function.transcribe_bedrock_analyzer.arn
}

output "transcribe_bedrock_lambda_name" {
  description = "Transcribe Bedrock Lambda Function Name"
  value       = aws_lambda_function.transcribe_bedrock_analyzer.function_name
}
