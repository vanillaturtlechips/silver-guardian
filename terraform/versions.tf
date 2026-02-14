terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2" # 서울 리전
  # 쉘 스크립트에서 입력받은 환경변수(AWS_ACCESS_KEY_ID 등)를 자동으로 사용합니다.
}