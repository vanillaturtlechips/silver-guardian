module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "silver-guardian-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-northeast-2a", "ap-northeast-2c"]
  
  # 1. Private Subnet (EKS 앱용)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"] 
  
  # 2. Public Subnet (Bastion, 로드밸런서용)
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"] 

  # 3. Database Subnet (RDS, Redis용) - 이 부분이 추가되었습니다!
  database_subnets = ["10.0.51.0/24", "10.0.52.0/24"]
  create_database_subnet_group = true

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}