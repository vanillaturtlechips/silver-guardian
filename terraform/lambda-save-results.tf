# Lambda 실행 Role
resource "aws_iam_role" "save_results_lambda_role" {
  name = "silver-guardian-save-results-lambda-role"

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
    Name    = "Silver Guardian Save Results Lambda Role"
    Project = "silver-guardian"
  }
}

# Lambda Policy
resource "aws_iam_role_policy" "save_results_lambda_policy" {
  name = "silver-guardian-save-results-lambda-policy"
  role = aws_iam_role.save_results_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda 함수 패키징
data "archive_file" "save_results_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/save-analysis-results"
  output_path = "${path.module}/../lambda/save-analysis-results.zip"
}

# Lambda 함수
resource "aws_lambda_function" "save_analysis_results" {
  filename         = data.archive_file.save_results_lambda.output_path
  function_name    = "silver-guardian-save-results"
  role            = aws_iam_role.save_results_lambda_role.arn
  handler         = "lambda_function.lambda_handler"
  source_code_hash = data.archive_file.save_results_lambda.output_base64sha256
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      DB_HOST     = aws_db_instance.postgres.address
      DB_PORT     = "5432"
      DB_NAME     = "silver_guardian"
      DB_USER     = "dev"
      DB_PASSWORD = "devpass123"  # TODO: Secrets Manager 사용
    }
  }

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name        = "Silver Guardian Save Results"
    Project     = "silver-guardian"
    Environment = "production"
  }
}

# Lambda Security Group
resource "aws_security_group" "lambda_sg" {
  name        = "silver-guardian-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "Silver Guardian Lambda SG"
    Project = "silver-guardian"
  }
}

# RDS Security Group에 Lambda 접근 허용
resource "aws_security_group_rule" "rds_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda_sg.id
  security_group_id        = aws_security_group.db_access.id
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "save_results_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.save_analysis_results.function_name}"
  retention_in_days = 7

  tags = {
    Name    = "Silver Guardian Save Results Lambda Logs"
    Project = "silver-guardian"
  }
}

# Output
output "save_results_lambda_arn" {
  description = "Save Results Lambda Function ARN"
  value       = aws_lambda_function.save_analysis_results.arn
}

output "save_results_lambda_name" {
  description = "Save Results Lambda Function Name"
  value       = aws_lambda_function.save_analysis_results.function_name
}
