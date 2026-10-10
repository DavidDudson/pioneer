variable "state_passphrase" {
  description = "Passphrase the state and plans are encrypted with (at least 16 characters)."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.state_passphrase) >= 16
    error_message = "Use a passphrase of at least 16 characters."
  }
}

variable "domain" {
  description = "Public hostname Pioneer is served on, e.g. pioneer.example.com. Becomes PUBLIC_ORIGIN."
  type        = string
}

variable "cloudflare_zone" {
  description = "Cloudflare zone (already on Cloudflare) that holds var.domain, e.g. example.com."
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the zone and runs the Worker."
  type        = string
}

variable "aws_region" {
  description = "AWS region for Lambda and ECR. Sydney, next to Neon's aws-ap-southeast-2 (ADR-0015)."
  type        = string
  default     = "ap-southeast-2"
}

variable "neon_org_id" {
  description = "Neon organisation that owns the project; null for the API key's default."
  type        = string
  default     = null
}

variable "image_tag" {
  description = <<-EOT
    ECR tag of the arm64 image the function is created with (`sha-<short commit>`). Only read on create:
    deploys replace the image outside OpenTofu (#114), so later changes here are ignored.
  EOT
  type        = string
}

variable "lambda_memory" {
  description = "Function memory in MB. 512 keeps a session within the free 400k GB-s a month (ADR-0015)."
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Function timeout in seconds: the longest any request, live sync streams included, can run and bill. Streams end after 5 minutes (ADR-0017)."
  type        = number
  default     = 360
}

variable "oauth" {
  description = <<-EOT
    Sign-in providers, keyed github, discord or google. Each needs an OAuth app whose callback is
    https://<domain>/api/auth/<provider>/callback. A provider left out is off.
  EOT
  type = map(object({
    client_id     = string
    client_secret = string
  }))
  default   = {}
  sensitive = true

  validation {
    condition     = alltrue([for provider in keys(var.oauth) : contains(["github", "discord", "google"], provider)])
    error_message = "Providers are github, discord and google."
  }
}

variable "github_repository" {
  description = "owner/name of the GitHub repository whose production environment may assume the deploy role."
  type        = string
  default     = "DavidDudson/pioneer"
}
