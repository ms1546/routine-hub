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
  default     = "routine-hub"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS tasks (at least 2 in different AZs)"
  type        = list(string)
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
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
