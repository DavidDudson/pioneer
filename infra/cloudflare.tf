data "cloudflare_zone" "pioneer" {
  filter = {
    name = var.cloudflare_zone
  }
}

locals {
  # Built by `bunx nx build edge` before plan or apply.
  worker_bundle = "${path.module}/../dist/apps/edge/worker.js"
}

# Forwards each request to the Function URL with a SigV4 signature, and keeps the web app's hashed assets in the
# edge cache (apps/edge). Cloudflare's free plan cannot rewrite Host, so a proxied DNS record alone cannot reach a
# Function URL (ADR-0015).
resource "cloudflare_workers_script" "edge" {
  account_id         = var.cloudflare_account_id
  script_name        = "pioneer-edge"
  main_module        = "worker.js"
  content_file       = local.worker_bundle
  content_sha256     = filesha256(local.worker_bundle)
  compatibility_date = "2026-10-01"

  bindings = [
    {
      name = "FUNCTION_URL"
      type = "plain_text"
      text = aws_lambda_function_url.api.function_url
    },
    {
      name = "AWS_ACCESS_KEY_ID"
      type = "secret_text"
      text = aws_iam_access_key.edge.id
    },
    {
      name = "AWS_SECRET_ACCESS_KEY"
      type = "secret_text"
      text = aws_iam_access_key.edge.secret
    },
  ]

  observability = {
    enabled = true
  }
}

# Creates the proxied DNS record and the edge certificate for var.domain.
resource "cloudflare_workers_custom_domain" "pioneer" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.pioneer.zone_id
  zone_name  = var.cloudflare_zone
  hostname   = var.domain
  service    = cloudflare_workers_script.edge.script_name
}
