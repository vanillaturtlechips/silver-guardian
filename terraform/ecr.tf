# 기존 백엔드 아래에 프론트엔드도 추가해주세요
resource "aws_ecr_repository" "frontend" {
  name                 = "silver-guardian-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_ecr_repository" "backend" {
  name                 = "silver-guardian-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}