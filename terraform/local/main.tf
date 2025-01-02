terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.82"
    }
  }
}

module "shared" {
  source = "../shared"
}

provider "aws" {
  region = module.shared.aws_region
  
  skip_credentials_validation = true
  skip_metadata_api_check    = true
  skip_requesting_account_id = true

  endpoints {
    dynamodb = "http://localhost:4566"
  }
}

