//terraform cloud
terraform {
  cloud {
    organization = "wiktor9196667"
    workspaces {
      name = "blog"
    }
  }

  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "3.74.1"
    }
  }
}

variable aws_access_key {
  type = string
  default = ""
}

variable "aws_secret_key" {
  type = string
  default = ""
}

variable "gh_access_token" {
  type = string
  default = ""
}

// aws
provider "aws" {
  region  = "eu-central-1"

  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

// import existing aws route 53 zone
data "aws_route53_zone" "wiktorkowalski" {
  name = "wiktorkowalski.pl"
}

//aws amplify app
resource "aws_amplify_app" "blog" {
  name         = "blog"
  repository   = "https://github.com/wiktorkowalski/blog"
  access_token = var.gh_access_token

  build_spec = file("build_spec.yml")
}

// aws amplify branch
resource "aws_amplify_branch" "master" {
  app_id      = aws_amplify_app.blog.id
  branch_name = "master"
}

// aws amplify domain
resource "aws_amplify_domain_association" "blog" {
  app_id      = aws_amplify_app.blog.id
  domain_name = "wiktorkowalski.pl"
  sub_domain {
    branch_name = aws_amplify_branch.master.branch_name
    prefix      = "blog"
  }
}
