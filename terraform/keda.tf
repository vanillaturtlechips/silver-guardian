# KEDA Helm 설치
resource "helm_release" "keda" {
  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  version    = "2.15.1"
  namespace  = "keda"

  create_namespace = true

  set {
    name  = "resources.operator.limits.cpu"
    value = "1"
  }

  set {
    name  = "resources.operator.limits.memory"
    value = "1000Mi"
  }

  set {
    name  = "resources.operator.requests.cpu"
    value = "100m"
  }

  set {
    name  = "resources.operator.requests.memory"
    value = "100Mi"
  }

  depends_on = [module.eks]
}
