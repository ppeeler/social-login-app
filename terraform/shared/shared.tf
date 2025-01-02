variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

output "aws_region" {
  value = var.aws_region
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "social-login-app"
}

output "app_name" {
  value = var.app_name
}

resource "aws_dynamodb_table" "users" {
  name           = "${var.app_name}-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Name = "${var.app_name}-users"
  }
}

output "dynamodb_users_table" {
  value = aws_dynamodb_table.users
}

