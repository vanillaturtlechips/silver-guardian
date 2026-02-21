output "ecr_repository_url" {
  description = "ECR Repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDS Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "Redis Endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "bastion_public_ip" {
  description = "Bastion Host Public IP"
  value       = aws_instance.bastion.public_ip
}

output "configure_kubectl_command" {
  description = "Run this command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ap-northeast-2 --name silver-guardian-cluster"
}

output "s3_bucket_name" {
  description = "S3 Uploads Bucket Name"
  value       = aws_s3_bucket.uploads.id
}

output "s3_bucket_arn" {
  description = "S3 Uploads Bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}

output "eventbridge_rule_name" {
  description = "EventBridge Rule Name for S3 Events"
  value       = aws_cloudwatch_event_rule.s3_upload.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group for S3 Events"
  value       = aws_cloudwatch_log_group.s3_events.name
}