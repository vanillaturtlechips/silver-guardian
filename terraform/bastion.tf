resource "aws_instance" "bastion" {
  ami           = "ami-0c9c942bd7bf113a2" # Ubuntu 22.04 LTS (ap-northeast-2)
  instance_type = "t3.micro"
  subnet_id     = module.vpc.public_subnets[0]
  
  # AWS 콘솔에서 생성한 키 페어 이름과 일치해야 합니다.
  key_name      = "silver-guardian-key" 

  # 공인 IP 자동 할당 (수정됨: 이 옵션이 있어야 IP가 출력됩니다)
  associate_public_ip_address = true 

  vpc_security_group_ids = [aws_security_group.bastion.id]

  tags = {
    Name = "silver-guardian-bastion"
  }
}