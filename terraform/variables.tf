variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "social-login-app"
}

variable "github_org" {
  type    = string
  default = "ppeeler"
}

variable "github_repo" {
  type    = string
  default = "social-login-app"
}
