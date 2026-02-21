module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "silver-guardian-cluster"
  cluster_version = "1.34"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      min_size     = 1
      max_size     = 3
      desired_size = 2
      instance_types = ["t3.medium"]
    }

    # ML 전용 Spot 인스턴스 노드 그룹
    ml_spot = {
      min_size     = 0
      max_size     = 5
      desired_size = 0  # Scale-to-zero (KEDA가 필요 시 자동 확장)

      # Spot 인스턴스 설정
      capacity_type = "SPOT"
      
      # CPU 최적화 인스턴스 (ML 추론용)
      instance_types = ["c5.xlarge", "c5.2xlarge", "c5a.xlarge"]

      # Taint 설정: ML 워크로드만 이 노드에 스케줄링
      taints = [
        {
          key    = "workload"
          value  = "ml"
          effect = "NoSchedule"
        }
      ]

      # 레이블 설정
      labels = {
        workload = "ml"
        nodeType = "spot"
      }

      # 태그
      tags = {
        Name        = "silver-guardian-ml-spot"
        Environment = "production"
        Workload    = "ml-inference"
      }
    }
  }

  enable_cluster_creator_admin_permissions = true

  access_entries = {
    # 1. 재원
    jaewon = {
      principal_arn = "arn:aws:iam::009946608368:user/SGO-Jaewon"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }

    # 2. 정한
    junghan = {
      principal_arn = "arn:aws:iam::009946608368:user/SGO-Junghan"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }

    # 3. RAPA Admin
    rapa_admin = {
      principal_arn = "arn:aws:iam::009946608368:user/RAPA_Admin"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }

    # 5. 문 재
    moonjae = {
      principal_arn = "arn:aws:iam::009946608368:user/SGO-Moonjae"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }
}