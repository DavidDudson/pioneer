# The identity GitHub Actions deploys with (#114, docs/production.md). Jobs in the repository's `production`
# environment exchange their OIDC token for this role; no long-lived AWS keys live in GitHub.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "deploy" {
  name = "pioneer-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Only the production environment, whose deployment branch policy allows main alone.
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:production"
        }
      }
    }]
  })
}

# What tools/deploy.ts does: push the image to ECR, read the function's settings, point it at the image. Reading or
# updating the function returns its whole environment, OAuth secrets included, so this role can read them all; the
# deploy uses DATABASE_URL to migrate and PUBLIC_ORIGIN to check health.
resource "aws_iam_role_policy" "deploy" {
  name = "deploy"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = aws_ecr_repository.api.arn
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:GetFunction", "lambda:GetFunctionConfiguration", "lambda:UpdateFunctionCode"]
        Resource = aws_lambda_function.api.arn
      },
    ]
  })
}

# Lets the Mirror adapter workflow authenticate to public ECR, which rate-limits anonymous pulls from shared runner IPs
# (429 "Data limit exceeded"). It can only fetch a public ECR token, so any branch of the repository may assume it:
# the first mirror runs from the PR that introduces it, before anything is on main.
resource "aws_iam_role" "mirror" {
  name = "pioneer-mirror"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "mirror" {
  name = "mirror"
  role = aws_iam_role.mirror.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr-public:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "sts:GetServiceBearerToken"
        Resource = "*"
      },
    ]
  })
}
