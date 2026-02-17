# 1. ArgoCD 설치 (Helm 사용)
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "5.55.0" # 안정적인 최신 버전

  # ArgoCD 내부 설정을 변경할 필요가 있다면 여기에 추가 (현재는 기본값)
  # 예: 서버를 HTTP로 돌리고 싶을 때 등
}

# 2. ArgoCD 전용 인그레스 설정 (Nginx를 통해 외부 노출)
resource "kubernetes_ingress_v1" "argocd_ingress" {
  depends_on = [helm_release.argocd] # ArgoCD가 먼저 설치된 후 생성

  metadata {
    name      = "argocd-server-ingress"
    namespace = "argocd"
    annotations = {
      "kubernetes.io/ingress.class"                  = "nginx"
      # ArgoCD 서버는 기본적으로 자체 SSL(443)을 사용하므로 Nginx가 백엔드에 HTTPS로 전달해야 함
      "nginx.ingress.kubernetes.io/backend-protocol" = "HTTPS"
      # HTTP 접속 시 HTTPS로 강제 리다이렉트
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      # gRPC 통신을 위해 필요한 설정
      "nginx.ingress.kubernetes.io/ssl-passthrough"  = "true"
    }
  }

  spec {
    rule {
      host = "argocd.silver-guardian.site" # 접속할 도메인 주소
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "argocd-server" # ArgoCD 공식 서비스 이름
              port {
                number = 443 # 내부 통신 포트
              }
            }
          }
        }
      }
    }
  }
}