# Terraform configuration for BlueCollar CDN setup
# Deploy with: terraform apply -var-file=prod.tfvars

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket = var.assets_bucket_name

  tags = {
    Name        = "BlueCollar Assets"
    Environment = var.environment
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for BlueCollar assets"
}

# S3 bucket policy for CloudFront
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# CloudFront cache policy for static assets
resource "aws_cloudfront_cache_policy" "static_assets" {
  name            = "bluecollar-static-assets"
  comment         = "Cache policy for static assets with versioning"
  default_ttl     = 31536000  # 1 year
  max_ttl         = 31536000
  min_ttl         = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# CloudFront cache policy for HTML
resource "aws_cloudfront_cache_policy" "html" {
  name            = "bluecollar-html"
  comment         = "Cache policy for HTML files"
  default_ttl     = 3600   # 1 hour
  max_ttl         = 86400  # 1 day
  min_ttl         = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name            = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id              = "S3-assets"
    origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  http_version        = "http2and3"

  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior for HTML files
  cache_behavior {
    path_pattern     = "*.html"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    cache_policy_id = aws_cloudfront_cache_policy.html.id

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.use_default_certificate
    acm_certificate_arn            = var.use_default_certificate ? null : var.acm_certificate_arn
    ssl_support_method             = var.use_default_certificate ? null : "sni-only"
    minimum_protocol_version       = var.use_default_certificate ? null : "TLSv1.2_2021"
  }

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_regional_domain_name
    prefix          = "cloudfront/"
  }

  tags = {
    Name        = "BlueCollar CDN"
    Environment = var.environment
  }
}

# S3 bucket for CloudFront logs
resource "aws_s3_bucket" "logs" {
  bucket = "${var.assets_bucket_name}-logs"

  tags = {
    Name        = "BlueCollar CDN Logs"
    Environment = var.environment
  }
}

# Block public access for logs bucket
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch log group for CDN monitoring
resource "aws_cloudwatch_log_group" "cdn" {
  name              = "/aws/cloudfront/bluecollar"
  retention_in_days = 30

  tags = {
    Name        = "BlueCollar CDN Logs"
    Environment = var.environment
  }
}

# Outputs
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.cdn.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for assets"
  value       = aws_s3_bucket.assets.id
}
