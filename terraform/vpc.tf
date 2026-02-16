module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "silver-guardian-vpc"
  cidr = "10.0.0.0/16"

  azs = ["ap-northeast-2a", "ap-northeast-2c"]

  # 1. Private Subnets (워커 노드 및 내부 리소스용)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"] 
  
  # 2. Public Subnets (인터넷 게이트웨이와 연결된 로드밸런서용)
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"] 

  # 3. Database Subnets (DB/Cache 전용)
  database_subnets             = ["10.0.51.0/24", "10.0.52.0/24"]
  create_database_subnet_group = true

  # 인터넷 연결 설정
  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true


  public_subnet_tags = {
    # "이 서브넷은 '인터넷용(Public) 로드밸런서'를 만드는 곳이다"라고 AWS에 알림
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/silver-guardian" = "shared"
  }

  private_subnet_tags = {
    # "이 서브넷은 '내부용(Internal) 로드밸런서'를 만드는 곳이다"라고 AWS에 알림
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/silver-guardian" = "shared"
  }

  tags = {
    "kubernetes.io/cluster/silver-guardian" = "shared"
  }
}