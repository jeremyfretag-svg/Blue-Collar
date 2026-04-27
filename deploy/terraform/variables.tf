# Terraform variables for CDN setup

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "assets_bucket_name" {
  description = "S3 bucket name for static assets"
  type        = string
  default     = "bluecollar-assets-prod"
}

variable "use_default_certificate" {
  description = "Use CloudFront default certificate"
  type        = bool
  default     = true
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = ""
}
