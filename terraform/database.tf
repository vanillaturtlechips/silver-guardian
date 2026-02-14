# 1. 사용 가능한 최신 Postgres 버전 조회 (자동)
data "aws_rds_engine_version" "postgres" {
  engine             = "postgres"
  parameter_group_family = "postgres16" # Postgres 16 계열 중 최신 버전 선택
}

# 2. RDS Instance (Postgres)
resource "aws_db_instance" "postgres" {
  identifier        = "silver-guardian-db"
  
  engine            = "postgres"
  # 위에서 조회한 최신 버전을 자동으로 할당 (예: 16.3, 16.4 등)
  engine_version    = data.aws_rds_engine_version.postgres.version
  
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  
  db_name  = "silver_guardian"
  username = "dev"
  password = "devpass123" 

  vpc_security_group_ids = [aws_security_group.db_access.id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  
  skip_final_snapshot    = true
  publicly_accessible    = false
  
  # 버전 업그레이드 충돌 방지
  auto_minor_version_upgrade = true
}

# 3. Redis (변경 없음)
resource "aws_elasticache_subnet_group" "redis" {
  name       = "silver-guardian-redis-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "silver-guardian-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.db_access.id]
}