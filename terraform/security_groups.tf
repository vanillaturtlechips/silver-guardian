# 1. Bastion SG: SSH 접속 허용
resource "aws_security_group" "bastion" {
  name        = "silver-guardian-bastion-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH from World"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 보안을 위해 본인 IP로 변경 권장
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. DB Access SG: Bastion과 EKS 노드에서만 접근 허용
resource "aws_security_group" "db_access" {
  name        = "silver-guardian-db-access-sg"
  vpc_id      = module.vpc.vpc_id

  # Postgres
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id, module.eks.node_security_group_id]
  }

  # Redis
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id, module.eks.node_security_group_id]
  }
}