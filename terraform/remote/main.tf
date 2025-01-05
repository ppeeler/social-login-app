# Keep in main.tf
terraform {
 required_providers {
   aws = {
     source  = "hashicorp/aws"
     version = "~> 5.82"
   }
 }
}

variable "domain" {
  type = string
}

module "shared" {
  source = "../shared"
}

provider "aws" {
  region = module.shared.aws_region
}

resource "aws_ecr_repository" "frontend" {
 name = "${module.shared.app_name}-frontend"
}

resource "aws_ecr_repository" "backend" {
 name = "${module.shared.app_name}-backend"
}

data "aws_caller_identity" "current" {}

# App Runner Service Role
resource "aws_iam_role" "app_runner_service" {
  name = "${module.shared.app_name}-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "build.apprunner.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_policy" {
  role       = aws_iam_role.app_runner_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_iam_role_policy" "app_runner_dynamodb" {
  name = "${module.shared.app_name}-dynamodb-policy"
  role = aws_iam_role.app_runner_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          module.shared.dynamodb_users_table.arn
        ]
      }
    ]
  })
}

resource "aws_apprunner_service" "frontend" {
  service_name = "${module.shared.app_name}-frontend"

  source_configuration {
    image_repository {
      image_configuration {
        port = "5173"
      }
      image_identifier      = "${aws_ecr_repository.frontend.repository_url}:latest"
      image_repository_type = "ECR"
    }
    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_service.arn
    }
  }
}

resource "aws_apprunner_service" "backend" {
  service_name = "${module.shared.app_name}-backend"

  source_configuration {
    image_repository {
      image_configuration {
        port = "5000"

        runtime_environment_variables = {
          # aws_ssm_parameter.cors_origins.value "AWS Systems Manager Parameters Store"
          CORS_ORIGINS = "https://${aws_apprunner_service.frontend.service_url},https://${var.domain}"
          FLASK_DEBUG = 1
          FLASK_ENV = "test"
        }
      }
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
    }
    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_service.arn
    }
  }
}

resource "null_resource" "update_env_vars" {
  depends_on = [aws_apprunner_service.frontend, aws_apprunner_service.backend]

  provisioner "local-exec" {
    command = <<-EOT
      aws apprunner update-service \
        --service-arn ${aws_apprunner_service.frontend.arn} \
        --source-configuration '{
          "ImageRepository": {
            "ImageConfiguration": {
              "RuntimeEnvironmentVariables": {
                "VITE_API_URL": "https://${aws_apprunner_service.backend.service_url},https://${var.domain}",
                "VITE_APP_ENV": "test"
              }
            }
          },
          "AuthenticationConfiguration": {
            "AccessRoleArn": "${aws_iam_role.app_runner_service.arn}"
          }
        }'
    EOT
  }
}