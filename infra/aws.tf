data "aws_caller_identity" "current" {}

locals {
  function_name = "pioneer-api"
  function_arn  = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.function_name}"

  # Each configured provider's pair, e.g. GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
  oauth_environment = merge(
    { for provider, app in var.oauth : "${upper(provider)}_CLIENT_ID" => app.client_id },
    { for provider, app in var.oauth : "${upper(provider)}_CLIENT_SECRET" => app.client_secret },
  )
}

# Lambda pulls images only from ECR in its own account, and only single-architecture images, so deploys copy the
# arm64 image from GHCR here (docs/production.md).
resource "aws_ecr_repository" "api" {
  name                 = local.function_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keeps storage to a few cents a month; older images are only needed to roll back a deploy or two.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 5 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# Lambda adds this itself on create when allowed to; declaring it keeps it out of drift.
resource "aws_ecr_repository_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LambdaPull"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Condition = { StringLike = { "aws:sourceArn" = local.function_arn } }
    }]
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}

resource "aws_iam_role" "api" {
  name = local.function_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Logging only: the function talks to Neon over the internet and needs no other AWS access.
resource "aws_iam_role_policy" "api_logs" {
  name = "logs"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.api.arn}:*"
    }]
  })
}

resource "aws_lambda_function" "api" {
  function_name = local.function_name
  role          = aws_iam_role.api.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
  architectures = ["arm64"]
  memory_size   = var.lambda_memory
  timeout       = var.lambda_timeout

  environment {
    variables = merge(local.oauth_environment, {
      DATABASE_URL  = neon_project.pioneer.connection_uri
      PUBLIC_ORIGIN = "https://${var.domain}"
      # Migrations are a deploy step (ADR-0011, ADR-0015), not something every cold start races to do.
      MIGRATE_ON_START = "false"
      # Lambda Web Adapter (ADR-0015): stream responses through the Function URL, and wait for the API's health
      # route before the first request.
      AWS_LWA_INVOKE_MODE          = "response_stream"
      AWS_LWA_READINESS_CHECK_PATH = "/api/health"
    })
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.api.name
  }

  depends_on = [aws_iam_role_policy.api_logs, aws_ecr_repository_policy.api]

  lifecycle {
    # Deploys (#114) update the image with `aws lambda update-function-code`; OpenTofu must not roll it back.
    ignore_changes = [image_uri]
  }
}

# Response streaming, and only SigV4-signed requests: the Worker is the one caller (ADR-0015).
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "RESPONSE_STREAM"
}

# The identity the Worker signs with. A Function URL with AWS_IAM auth needs both actions; InvokeFunction is limited
# to calls through the Function URL, so the keys cannot invoke the function any other way.
resource "aws_iam_user" "edge" {
  name = "pioneer-edge"
}

resource "aws_iam_user_policy" "edge" {
  name = "invoke-function-url"
  user = aws_iam_user.edge.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "lambda:InvokeFunctionUrl"
        Resource  = aws_lambda_function.api.arn
        Condition = { StringEquals = { "lambda:FunctionUrlAuthType" = "AWS_IAM" } }
      },
      {
        Effect    = "Allow"
        Action    = "lambda:InvokeFunction"
        Resource  = aws_lambda_function.api.arn
        Condition = { Bool = { "lambda:InvokedViaFunctionUrl" = "true" } }
      },
    ]
  })
}

# Rotate with `tofu apply -replace=aws_iam_access_key.edge`: the Worker picks up the new pair in the same apply.
resource "aws_iam_access_key" "edge" {
  user = aws_iam_user.edge.name
}
