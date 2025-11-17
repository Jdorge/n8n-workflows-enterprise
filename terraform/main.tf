terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "nexus-terraform-state"
    key    = "nexus-n8n.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "nexus-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "nexus-${var.environment}"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 1
      max_size     = 10

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# RDS PostgreSQL 16
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "nexus-postgres-${var.environment}"

  engine               = "postgres"
  engine_version       = "16.1"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = "db.t3.micro"

  allocated_storage = 20

  db_name  = "n8n"
  username = "n8n"
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = true

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# ElastiCache Redis 7
module "redis" {
  source = "cloudposse/elasticache-redis/aws"
  version = "0.50.0"

  name               = "nexus-redis-${var.environment}"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.private_subnets

  cluster_size       = 2
  instance_type      = "cache.t3.micro"
  engine_version     = "7.0"
  family             = "redis7"

  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# KMS Key
resource "aws_kms_key" "nexus" {
  description             = "KMS key for NEXUS n8n encryption"
  deletion_window_in_days = 10

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# S3 Bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "nexus-n8n-backups-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.nexus.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "nexus-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "nexus-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  tags = {
    Environment = var.environment
    Project     = "nexus-n8n"
  }
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.db.db_instance_address
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.endpoint
}

output "s3_backup_bucket" {
  description = "S3 bucket for backups"
  value       = aws_s3_bucket.backups.bucket
}