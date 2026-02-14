output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "vpc_id" {
  description = "VPC ID used for deployment"
  value       = local.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs used for deployment"
  value       = local.subnet_ids
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Application URL (domain if configured, otherwise ALB DNS)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.main.arn
}

output "dynamodb_user_settings_table" {
  description = "Name of the DynamoDB user settings table"
  value       = aws_dynamodb_table.user_settings.name
}

output "dynamodb_routines_table" {
  description = "Name of the DynamoDB routines table"
  value       = aws_dynamodb_table.routines.name
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs_logs.name
}

output "dynamodb_ai_execution_logs_table" {
  description = "Name of the DynamoDB AI execution logs table"
  value       = aws_dynamodb_table.ai_execution_logs.name
}
