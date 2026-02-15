variable "environment" {
  description = "Environment name (preview or production)"
  type        = string
  validation {
    condition     = contains(["preview", "production"], var.environment)
    error_message = "Environment must be either 'preview' or 'production'."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "routune-hub"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "create_vpc" {
  description = "Create VPC and public subnets with Terraform"
  type        = bool
  default     = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (at least 2)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "Public subnet CIDR blocks must include at least two entries."
  }
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed when create_vpc is false"
  type        = string
  default     = ""
  validation {
    condition     = var.vpc_id == "" || can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must start with 'vpc-' when provided."
  }
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS tasks when create_vpc is false"
  type        = list(string)
  default     = []
  validation {
    condition     = length(var.subnet_ids) == 0 || alltrue([for subnet_id in var.subnet_ids : can(regex("^subnet-", subnet_id))])
    error_message = "Subnet IDs must start with 'subnet-' when provided."
  }
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
  validation {
    condition     = var.domain_name == "" || can(regex("\\.", var.domain_name))
    error_message = "Domain name must contain a dot when provided."
  }
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the domain (optional)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN (optional)"
  type        = string
  default     = ""
}

variable "pr_number" {
  description = "PR number for preview environments (optional)"
  type        = string
  default     = ""
}

# ECS Configuration
variable "ecs_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "Memory (MB) for ECS task"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "container_port" {
  description = "Port on which the container listens"
  type        = number
  default     = 3000
}

variable "ecs_assign_public_ip" {
  description = "Assign public IP to ECS tasks (useful when running in public subnets without NAT)"
  type        = bool
  default     = true
}

# Docker Image
variable "ecr_repository_url" {
  description = "ECR repository URL for the Docker image"
  type        = string
  default     = ""
}

variable "docker_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Environment Variables (sensitive values should be stored in Secrets Manager)
variable "env_vars" {
  description = "Environment variables for ECS task (non-sensitive)"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Secrets Manager ARNs mapped to environment variable names"
  type        = map(string)
  default     = {}
  sensitive   = true
}

# DynamoDB Configuration
variable "enable_point_in_time_recovery" {
  description = "Enable DynamoDB point-in-time recovery"
  type        = bool
  default     = false
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# Scheduled Shutdown Configuration
variable "enable_scheduled_shutdown" {
  description = "Enable scheduled shutdown/startup of ECS service and ALB"
  type        = bool
  default     = false
}

variable "stop_schedule_expression" {
  description = "Cron expression for stopping ECS/ALB (e.g., 'cron(0 22 * * ? *)' for 22:00 UTC)"
  type        = string
  default     = "cron(0 22 * * ? *)" # 22:00 UTC (7:00 JST next day)
}

variable "start_schedule_expression" {
  description = "Cron expression for starting ECS/ALB (e.g., 'cron(0 6 * * ? *)' for 6:00 UTC)"
  type        = string
  default     = "cron(0 6 * * ? *)" # 6:00 UTC (15:00 JST)
}
