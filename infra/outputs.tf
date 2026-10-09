output "public_origin" {
  description = "Where Pioneer is served; register OAuth callbacks under it."
  value       = "https://${var.domain}"
}

output "ecr_repository_url" {
  description = "Push arm64 images here; the function runs one of them."
  value       = aws_ecr_repository.api.repository_url
}

output "function_name" {
  description = "Lambda function to point at a new image on deploy."
  value       = aws_lambda_function.api.function_name
}

output "function_url" {
  description = "Signed requests only; browsers go through the Worker at public_origin."
  value       = aws_lambda_function_url.api.function_url
}

output "database_url" {
  description = "Direct (session) connection to Neon, for `pioneer-api migrate`."
  value       = neon_project.pioneer.connection_uri
  sensitive   = true
}
