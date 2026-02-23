# IAM Role for Step Functions
resource "aws_iam_role" "step_functions_role" {
  name = "silver-guardian-step-functions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name    = "Silver Guardian Step Functions Role"
    Project = "silver-guardian"
  }
}

# IAM Policy for Step Functions
resource "aws_iam_role_policy" "step_functions_policy" {
  name = "silver-guardian-step-functions-policy"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:ap-northeast-2:*:function:silver-guardian-*"
      },
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
          "events:RetrieveConnectionCredentials",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [aws_cloudwatch_event_connection.sfn_http_conn.arn]
      }
    ]
  })
}

# Step Functions State Machine
resource "aws_sfn_state_machine" "analysis_workflow" {
  name     = "silver-guardian-analysis-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = templatefile("${path.module}/step-functions/analysis-workflow.json", {
    connection_arn = aws_cloudwatch_event_connection.sfn_http_conn.arn
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_functions_logs.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tags = {
    Name        = "Silver Guardian Analysis Workflow"
    Project     = "silver-guardian"
    Environment = "production"
  }
}

# CloudWatch Logs for Step Functions
resource "aws_cloudwatch_log_group" "step_functions_logs" {
  name              = "/aws/stepfunctions/silver-guardian-analysis"
  retention_in_days = 7

  tags = {
    Name    = "Silver Guardian Step Functions Logs"
    Project = "silver-guardian"
  }
}

# EventBridge Rule to trigger Step Functions on S3 upload
# (기존 eventbridge.tf의 s3_upload 규칙을 대체)
resource "aws_cloudwatch_event_target" "step_functions_target" {
  rule      = aws_cloudwatch_event_rule.s3_upload.name
  target_id = "StepFunctionsTarget"
  arn       = aws_sfn_state_machine.analysis_workflow.arn
  role_arn  = aws_iam_role.eventbridge_step_functions_role.arn
}

# IAM Role for EventBridge to invoke Step Functions
resource "aws_iam_role" "eventbridge_step_functions_role" {
  name = "silver-guardian-eventbridge-step-functions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name    = "Silver Guardian EventBridge Step Functions Role"
    Project = "silver-guardian"
  }
}

# IAM Policy for EventBridge to invoke Step Functions
resource "aws_iam_role_policy" "eventbridge_step_functions_policy" {
  name = "silver-guardian-eventbridge-step-functions-policy"
  role = aws_iam_role.eventbridge_step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartExecution"
        ]
        Resource = aws_sfn_state_machine.analysis_workflow.arn
      }
    ]
  })
}

# Output
output "step_functions_arn" {
  description = "Step Functions State Machine ARN"
  value       = aws_sfn_state_machine.analysis_workflow.arn
}

output "step_functions_name" {
  description = "Step Functions State Machine Name"
  value       = aws_sfn_state_machine.analysis_workflow.name
}

resource "aws_cloudwatch_event_connection" "sfn_http_conn" {
  name               = "silver-guardian-http-connection"
  authorization_type = "API_KEY"
  auth_parameters {
    api_key {
      key   = "x-unused-key"
      value = "dummy-value"
    }
  }
}
