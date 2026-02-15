terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend configuration is provided via -backend-config during terraform init
  # This allows different state keys for each environment (production, preview/pr-123, etc.)
  # Example: terraform init -backend-config="bucket=routune-hub-terraform-state" -backend-config="key=production/terraform.tfstate"
  backend "s3" {
    # Backend configuration is provided via -backend-config during init
    # This allows dynamic state keys per environment
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "Terraform"
      },
      var.tags
    )
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values for resource naming
locals {
  name_prefix = var.environment == "preview" && var.pr_number != "" ? "${var.project_name}-${var.environment}-pr${var.pr_number}" : "${var.project_name}-${var.environment}"

  # ALB listener path for preview environments
  alb_path = var.environment == "preview" && var.pr_number != "" ? "/pr-${var.pr_number}*" : "/*"

  enable_https        = var.domain_name != ""
  acm_certificate_arn = var.acm_certificate_arn != "" ? var.acm_certificate_arn : try(aws_acm_certificate.main[0].arn, "")

  vpc_id            = var.create_vpc ? aws_vpc.main[0].id : var.vpc_id
  public_subnet_azs = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
  subnet_ids        = var.create_vpc ? aws_subnet.public[*].id : var.subnet_ids

  secret_env_var_arns = [
    for value in values(var.secret_env_vars) :
    can(regex("^arn:", value)) ? "${value}*" : "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${value}*"
  ]

  secrets_manager_arns = compact(distinct(concat(
    ["arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/*"],
    local.secret_env_var_arns
  )))
}

# VPC (optional)
resource "aws_vpc" "main" {
  count = var.create_vpc ? 1 : 0

  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  count = var.create_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_route_table" "public" {
  count = var.create_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_subnet" "public" {
  count = var.create_vpc ? length(var.public_subnet_cidrs) : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.public_subnet_azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${count.index + 1}"
  }
}

resource "aws_route_table_association" "public" {
  count = var.create_vpc ? length(aws_subnet.public) : 0

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Name = "${local.name_prefix}-logs"
  }
}

# ACM Certificate (optional)
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" && var.acm_certificate_arn == "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = {
    Name = "${local.name_prefix}-certificate"
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.domain_name != "" && var.acm_certificate_arn == "" && var.hosted_zone_id != "" ? {
    for option in aws_acm_certificate.main[0].domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      type   = option.resource_record_type
      record = option.resource_record_value
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" && var.acm_certificate_arn == "" && var.hosted_zone_id != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

# DynamoDB Tables
resource "aws_dynamodb_table" "user_settings" {
  name           = "${local.name_prefix}-user-settings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = "${local.name_prefix}-user-settings"
  }
}

resource "aws_dynamodb_table" "routines" {
  name           = "${local.name_prefix}-routines"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "routineId"

  attribute {
    name = "routineId"
    type = "S"
  }

  attribute {
    name = "owner"
    type = "S"
  }

  attribute {
    name = "visibility"
    type = "S"
  }

  global_secondary_index {
    name            = "owner-visibility-index"
    hash_key        = "owner"
    range_key       = "visibility"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = "${local.name_prefix}-routines"
  }
}

# DynamoDB Table for AI Execution Logs
resource "aws_dynamodb_table" "ai_execution_logs" {
  name           = "${local.name_prefix}-ai-execution-logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "executionId"

  attribute {
    name = "executionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "executedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "user-executed-at-index"
    hash_key        = "userId"
    range_key       = "executedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = "${local.name_prefix}-ai-execution-logs"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.name_prefix}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-ecs-task-execution-role"
  }
}

# IAM Policy for ECS Task Execution (to pull images and write logs)
resource "aws_iam_role_policy" "ecs_task_execution_policy" {
  name = "${local.name_prefix}-ecs-task-execution-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs_logs.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = local.secrets_manager_arns
      }
    ]
  })
}

# IAM Role for ECS Task (application permissions)
resource "aws_iam_role" "ecs_task_role" {
  name = "${local.name_prefix}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-ecs-task-role"
  }
}

# IAM Policy for ECS Task (DynamoDB, Bedrock, Secrets Manager)
resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${local.name_prefix}-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

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
          aws_dynamodb_table.user_settings.arn,
          aws_dynamodb_table.routines.arn,
          "${aws_dynamodb_table.routines.arn}/index/*",
          aws_dynamodb_table.ai_execution_logs.arn,
          "${aws_dynamodb_table.ai_execution_logs.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = local.secrets_manager_arns
      }
    ]
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = local.name_prefix
  }
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Security group for ALB"
  vpc_id      = local.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks"
  description = "Security group for ECS tasks"
  vpc_id      = local.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-ecs-tasks"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = local.name_prefix
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = local.subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = local.name_prefix
  }
}

# ALB Target Group
resource "aws_lb_target_group" "main" {
  name        = local.name_prefix
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = local.name_prefix
  }
}

# ALB Listener (HTTP)
resource "aws_lb_listener" "http" {
  count = local.enable_https ? 0 : 1

  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count = local.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count = local.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = local.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# ECS Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = local.name_prefix
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "routune-hub"
      image = var.ecr_repository_url != "" ? "${var.ecr_repository_url}:${var.docker_image_tag}" : "${var.project_name}:${var.docker_image_tag}"

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in var.env_vars : {
          name  = key
          value = value
        }
      ]

      secrets = [
        for key, value in var.secret_env_vars : {
          name      = key
          valueFrom = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name = local.name_prefix
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = local.name_prefix
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = var.ecs_assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "routune-hub"
    container_port   = var.container_port
  }

  # Allow external changes to task count (for manual scaling)
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = local.name_prefix
  }
}

resource "aws_route53_record" "app" {
  count = var.domain_name != "" && var.hosted_zone_id != "" ? 1 : 0

  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# IAM Role for Lambda (ECS/ALB Start/Stop)
resource "aws_iam_role" "scheduler_lambda_role" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  name = "${local.name_prefix}-scheduler-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-scheduler-lambda-role"
  }
}

# IAM Policy for Lambda to control ECS and ALB
resource "aws_iam_role_policy" "scheduler_lambda_policy" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  name = "${local.name_prefix}-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_lambda_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = aws_ecs_service.main.id
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:ModifyLoadBalancerAttributes",
          "elasticloadbalancing:DescribeLoadBalancers"
        ]
        Resource = aws_lb.main.arn
      }
    ]
  })
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "scheduler_lambda_logs" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  name              = "/aws/lambda/${local.name_prefix}-scheduler"
  retention_in_days = 7

  tags = {
    Name = "${local.name_prefix}-scheduler-lambda-logs"
  }
}

# Lambda function for ECS/ALB scheduling
resource "aws_lambda_function" "scheduler" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  function_name = "${local.name_prefix}-scheduler"
  role          = aws_iam_role.scheduler_lambda_role[0].arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60

  filename         = "${path.module}/lambda/scheduler.zip"
  source_code_hash = fileexists("${path.module}/lambda/scheduler.zip") ? filebase64sha256("${path.module}/lambda/scheduler.zip") : null

  environment {
    variables = {
      ECS_CLUSTER_NAME = aws_ecs_cluster.main.name
      ECS_SERVICE_NAME = aws_ecs_service.main.name
      ALB_ARN          = aws_lb.main.arn
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.scheduler_lambda_logs,
    aws_iam_role_policy.scheduler_lambda_policy
  ]

  tags = {
    Name = "${local.name_prefix}-scheduler"
  }
}

# EventBridge Rule for stopping ECS/ALB (night)
resource "aws_cloudwatch_event_rule" "stop_service" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  name                = "${local.name_prefix}-stop-service"
  description         = "Stop ECS service and ALB at night"
  schedule_expression = var.stop_schedule_expression
  state               = "ENABLED"

  tags = {
    Name = "${local.name_prefix}-stop-service"
  }
}

# EventBridge Rule for starting ECS/ALB (morning)
resource "aws_cloudwatch_event_rule" "start_service" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  name                = "${local.name_prefix}-start-service"
  description         = "Start ECS service and ALB in the morning"
  schedule_expression = var.start_schedule_expression
  state               = "ENABLED"

  tags = {
    Name = "${local.name_prefix}-start-service"
  }
}

# EventBridge Target for stopping service
resource "aws_cloudwatch_event_target" "stop_service" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  rule      = aws_cloudwatch_event_rule.stop_service[0].name
  target_id = "StopService"
  arn       = aws_lambda_function.scheduler[0].arn

  input = jsonencode({
    action = "stop"
  })
}

# EventBridge Target for starting service
resource "aws_cloudwatch_event_target" "start_service" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  rule      = aws_cloudwatch_event_rule.start_service[0].name
  target_id = "StartService"
  arn       = aws_lambda_function.scheduler[0].arn

  input = jsonencode({
    action = "start"
  })
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge_stop" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridgeStop"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.scheduler[0].function_name
  principal      = "events.amazonaws.com"
  source_arn     = aws_cloudwatch_event_rule.stop_service[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge_start" {
  count = var.enable_scheduled_shutdown ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridgeStart"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.scheduler[0].function_name
  principal      = "events.amazonaws.com"
  source_arn     = aws_cloudwatch_event_rule.start_service[0].arn
}
