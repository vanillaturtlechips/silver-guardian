# 1. Nginx Ingress Controller 설치 (이게 진짜 ALB를 만듭니다)
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "kube-system" # 보통 시스템 namespace에 둡니다
  
  # ALB를 생성하도록 설정
  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type"
    value = "nlb" # 성능 좋은 NLB 사용 (또는 nlb-ip)
  }
  
  # ALB 주소가 나올 때까지 기다림 (중요!)
  wait = true
}

# 2. 생성된 ALB 주소 가져오기 (데이터 소스)
data "kubernetes_service_v1" "nginx_svc" {
  metadata {
    name      = "nginx-ingress-ingress-nginx-controller"
    namespace = "kube-system"
  }
  depends_on = [helm_release.nginx_ingress]
}

# 3. Cloudflare에 도메인 등록 (자동 갱신)
# 예: *.silver-guardian.site -> 방금 만든 ALB 주소
resource "cloudflare_record" "wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*" # 모든 서브도메인(api, www 등)을 여기로 연결
  value   = data.kubernetes_service_v1.nginx_svc.status.0.load_balancer.0.ingress.0.hostname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@" # 루트 도메인 (silver-guardian.site)
  value   = data.kubernetes_service_v1.nginx_svc.status.0.load_balancer.0.ingress.0.hostname
  type    = "CNAME"
  proxied = true
}