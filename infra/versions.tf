# Production for Pioneer (ADR-0015): the API image on AWS Lambda in Sydney, Postgres on Neon Free, and a
# Cloudflare Worker in front for the domain, TLS and edge caching. The runbook is docs/production.md.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.27"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.18"
    }
  }

  # State lives in an R2 bucket through R2's S3 API. The account-specific settings (endpoint, credentials profile)
  # come from backend.hcl: `tofu init -backend-config=backend.hcl`. See backend.hcl.example.
  backend "s3" {
    bucket = "pioneer-tofu-state"
    key    = "production/terraform.tfstate"
    region = "auto"

    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }

  # State holds the database password, the OAuth secrets and the Worker's IAM keys, so it is encrypted before it
  # leaves this machine. Losing the passphrase loses the state (not the resources); keep it in the password manager.
  encryption {
    key_provider "pbkdf2" "state" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state
    }
    state {
      method   = method.aes_gcm.state
      enforced = true
    }
    plan {
      method   = method.aes_gcm.state
      enforced = true
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "pioneer"
      environment = "production"
      managed-by  = "opentofu"
    }
  }
}

# Reads CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

# Reads NEON_API_KEY.
provider "neon" {}
