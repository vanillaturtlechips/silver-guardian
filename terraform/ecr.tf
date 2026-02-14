resource "aws_ecr_repository" "backend" {
  name                 = "silver-guardian-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # 테라폼 삭제 시 이미지 있어도 강제 삭제
}