---
author: Wiktor Kowalski
pubDatetime: 2024-02-05T08:00:00.000Z
title: Astro website on S3 and CloudFront with Terraform
postSlug: astro-on-s3-and-cloudfront-with-terraform
featured: true
tags:
  - aws
  - s3
  - route53
  - astro
  - terraform
  - actions
description: Hosting a static Astro website on AWS S3 and CloudFront using Terraform and CI/CD
---

# What you're going to learn

I'm going to show you how to deploy your static Astro site to AWS S3, add CloudFront CDN and attach your Route 53 domain with custom ACM certificate to all that.

Some assumptions:

- Having an AWS account
- Basic knowledge about Terraform and CI/CD pipelines
- Basic knowledge about AWS services used here
- Having a Route 53 domain

I'll try to explain as I'm going through what needs to be set up, but I might skip over some basics.  
Everything shown here and required for the setup to work is in [this repo](https://github.com/wiktorkowalski/astro-s3-cloudfront-terraform-example) i case you want to look just at the code.

Both CloudFront and Route 53 are not required for all that to work, but it's a nice package when it's all used together.  
If you don't want to use a custom domain and CDN you'd have to skip some of the Terraform and pipelines setup by yourself or check out [this branch](https://github.com/wiktorkowalski/astro-s3-cloudfront-terraform-example/tree/simplified-s3-only) with just S3 set up.

# Astro site

The Astro site itself is not really important at this moment, so we're gonna use auto-generated one.
It doesn't even have to be an Astro site, just any static site framework that on build generates `*/index.html` files.

So let's create the simplest Astro website:

```bash
npm create astro@latest
```

give your project any name you want and you can select all the defaults options that Astro template has.

Then you can run `npm run dev` just to check if the website starts.  
Once that's taken care of, we can move to more interesting parts.

# Terraform

That's where the most of the interesting stuff happens.  
Let's start by setting up Terraform itself

In the repo root folder run

```bash
mkdir infra && cd infra
```

and create first Terraform file containing provider definitions.  
Two providers are needed, because ACM certificates have to be created in `us-east-1` region, while all other resources can be created in any other region.

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "5.34.0"
    }
  }
}

provider "aws" {
  region  = "eu-west-1"
}

# this one is needed for SSL cert
provider "aws" {
  alias   = "us-east-1"
  region  = "us-east-1"
}
```

then you can run `terraform init` to setup terraform and load provider.

Create a `terraform.tfvars` file to have a single place with parameters:

```hcl
# terraform.tfvars
dns_zone_name       = "example.com"
main_domain_name    = "example.com"
domain_aliases      = ["another.example.com"]
website_bucket_name = "example-bucket"
aws_region          = "eu-west-1"

```

Now let's create a S3 bucket for static website files. Fortunatley, S3 has some features geared towards hosting static websites, hence we're using `aws_s3_bucket_website_configuration` resource to make this setup easier.

```hcl
# s3.tf
resource "aws_s3_bucket" "website_bucket" {
  bucket = var.website_bucket_name
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_ownership_controls" "website_bucket" {
  bucket = aws_s3_bucket.website_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "website_bucket" {
  bucket = aws_s3_bucket.website_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "website_bucket" {
  depends_on = [
    aws_s3_bucket_ownership_controls.website_bucket,
    aws_s3_bucket_public_access_block.website_bucket,
  ]

  bucket = aws_s3_bucket.website_bucket.id
  acl    = "public-read"
}

resource "aws_s3_bucket_policy" "policy" {
  bucket = aws_s3_bucket.website_bucket.id
  policy = data.aws_iam_policy_document.s3_bucket_policy.json
}

data "aws_iam_policy_document" "s3_bucket_policy" {
  statement {
    sid    = "PublicReadGetObject"
    effect = "Allow"

    resources = [
      "arn:aws:s3:::${var.website_bucket_name}",
      "arn:aws:s3:::${var.website_bucket_name}/*",
    ]

    actions = [
      "s3:PutBucketPolicy",
      "s3:GetBucketPolicy",
      "s3:DeleteBucketPolicy",
      "s3:GetObject",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}
```

Then create a CloudFront distribution.

```hcl
# cloudfront.tf
resource "aws_cloudfront_distribution" "website_distribution" {
  origin {
    domain_name = "${var.website_bucket_name}.s3-website-${var.aws_region}.amazonaws.com"
    origin_id   = var.website_bucket_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_keepalive_timeout = 5
      origin_read_timeout = 30
    }
  }

  enabled             = true
  default_root_object = "index.html"
  comment = "website"

  aliases = [
    var.main_domain_name,
    var.domain_aliases[0],
  ]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = var.website_bucket_name

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_All"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2018"
  }
}
```

and finish with Route 53 and ACM resources

```hcl
# route53.tf
# import existing aws route 53 zone
data "aws_route53_zone" "main_domain_name" {
  name = var.main_domain_name
}
resource "aws_route53_record" "url" {
  zone_id = data.aws_route53_zone.main_domain_name.zone_id
  name    = var.main_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main_domain_name.zone_id
  name    = var.domain_aliases[0]
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}
```

```hcl
# acm.tf
resource "aws_route53_record" "certvalidation" {
  for_each = {
    for d in aws_acm_certificate.cert.domain_validation_options : d.domain_name => {
      name   = d.resource_record_name
      record = d.resource_record_value
      type   = d.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main_domain_name.zone_id
}

resource "aws_acm_certificate_validation" "certvalidation" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for r in aws_route53_record.certvalidation : r.fqdn]
}

resource "aws_acm_certificate" "cert" {
  provider                  = aws.us-east-1
  domain_name               = var.main_domain_name
  subject_alternative_names = var.domain_aliases
  validation_method         = "DNS"
}
```

# Deployment pipeline

For all I care you can run `terraform apply` and then `s3 sync` by yourself.  
If that's not fancy enough for you, then let's go over a basic pipeline that's going to do all that for you.

Main steps that you want to take each time changes were commites is:

- Plan terraform changes and apply if the are any
- Build Astro site
- Publish build artifacts to S3 bucket
- Create a CloudFront Cache invalidation

Here's a basic pipeline that does all that:

```yaml
name: "Build and Publish"

on:
  push:
    branches:
      - master
  workflow_dispatch:

jobs:
  terraform:
    name: "Terraform"
    runs-on: ubuntu-latest
    outputs:
      bucket_url: ${{ steps.bucket.outputs.BUCKET_URL }}
      website_url: ${{ steps.website.outputs.WEBSITE_URL }}
      cloudfront_distribution_id: ${{ steps.cloudfront.outputs.CLOUDFRONT_DISTRIBUTION_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
          aws-region: eu-west-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.6

      - name: Terraform Init
        run: terraform init
        working-directory: ./infra

      - name: Terraform Validate
        run: terraform validate
        working-directory: ./infra

      - name: Terraform Plan
        run: terraform plan
        working-directory: ./infra
        continue-on-error: false

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: ./infra

      - name: Set Bucket URL
        id: bucket
        run: echo "BUCKET_URL=$(terraform output -raw bucket_url)" >> "$GITHUB_OUTPUT"
        working-directory: ./infra

      - name: Set Website URL
        id: website
        run: echo "WEBSITE_URL=$(terraform output -raw website_url)" >> "$GITHUB_OUTPUT"
        working-directory: ./infra

      - name: Set CloudFront Distribution ID
        id: cloudfront
        run: echo "CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)" >> "$GITHUB_OUTPUT"
        working-directory: ./infra

  build:
    needs: terraform
    name: "Build"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 21

      - name: Install Dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload dist folder
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  publish:
    needs: [terraform, build]
    name: "Publish"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download dist folder
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
          aws-region: eu-west-1

      - name: Sync to S3
        env:
          AWS_S3_BUCKET: ${{ needs.terraform.outputs.bucket_url }}
        run: aws s3 sync dist/ $AWS_S3_BUCKET --delete

      - name: Invalidate CloudFront
        env:
          CLOUDFRONT_DISTRIBUTION_ID: ${{ needs.terraform.outputs.cloudfront_distribution_id }}
        run: aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" "/"

      - name: Echo URL
        env:
          WEBSITE_URL: ${{ needs.terraform.outputs.website_url }}
        run: echo "$WEBSITE_URL" >> "$GITHUB_STEP_SUMMARY"
```

# Summary

This setup gives you a quick and easy way to deploy static Astro websites to AWS using Terraform.

Remember that repo with everything required is available [here](https://github.com/wiktorkowalski/astro-s3-cloudfront-terraform-example).  
Also, a branch with simplified setup that skips CloudFront, Route53 and ACM is available on the branch [here](https://github.com/wiktorkowalski/astro-s3-cloudfront-terraform-example/tree/simplified-s3-only).
