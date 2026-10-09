# Neon Free in Sydney (ADR-0015). The app uses the direct endpoint, never the pooler: live sync holds a session
# that LISTENs (ADR-0006), which a transaction-mode pooler cannot keep.
resource "neon_project" "pioneer" {
  name       = "pioneer"
  org_id     = var.neon_org_id
  region_id  = "aws-${var.aws_region}"
  pg_version = 18

  # The free plan keeps at most 6 hours of history; nightly dumps to R2 cover the rest (#115).
  history_retention_seconds = 21600

  branch {
    name          = "main"
    database_name = "pioneer"
    role_name     = "pioneer"
  }

  # Capped at 0.25 CU so the free 100 CU-hours cover ~400 awake hours a month. Scale to zero after 5 minutes idle is
  # fixed on the free plan.
  primary_compute {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 0.25
  }
}
