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