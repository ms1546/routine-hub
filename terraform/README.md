# Routine Hub Infrastructure (Terraform)

This directory contains Terraform configurations for deploying Routine Hub to AWS.

## Architecture

- **ECS Fargate**: Containerized Next.js application
- **Application Load Balancer (ALB)**: Load balancing and HTTPS termination
- **DynamoDB**: User settings and routines storage
- **IAM**: Roles and policies for ECS tasks
- **CloudWatch**: Logging and monitoring

## Environment Variables

The Terraform configuration uses variables to distinguish between `preview` and `production` environments. A single codebase is used with variables to switch between environments.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **VPC and Subnets**: Existing VPC with at least 2 subnets in different availability zones
4. **ECR Repository** (optional): If using ECR for Docker images

## Usage

### Initialize Terraform

```bash
cd terraform
terraform init
```

### Plan Deployment

**Preview Environment:**
```bash
terraform plan \
  -var="environment=preview" \
  -var="vpc_id=vpc-xxxxx" \
  -var="subnet_ids=[subnet-xxxxx,subnet-yyyyy]" \
  -var="pr_number=123"
```

**Production Environment:**
```bash
terraform plan \
  -var="environment=production" \
  -var="vpc_id=vpc-xxxxx" \
  -var="subnet_ids=[subnet-xxxxx,subnet-yyyyy]"
```

### Apply Configuration

**Preview Environment:**
```bash
terraform apply \
  -var="environment=preview" \
  -var="vpc_id=vpc-xxxxx" \
  -var="subnet_ids=[subnet-xxxxx,subnet-yyyyy]" \
  -var="pr_number=123"
```

**Production Environment:**
```bash
terraform apply \
  -var="environment=production" \
  -var="vpc_id=vpc-xxxxx" \
  -var="subnet_ids=[subnet-xxxxx,subnet-yyyyy]"
```

### Using Terraform Variables File

You can create environment-specific variable files:

**`terraform.tfvars.preview`**:
```hcl
environment = "preview"
vpc_id      = "vpc-xxxxx"
subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy"]
pr_number   = "123"
```

**`terraform.tfvars.production`**:
```hcl
environment = "production"
vpc_id      = "vpc-xxxxx"
subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy"]
```

Then use:
```bash
terraform plan -var-file="terraform.tfvars.preview"
terraform apply -var-file="terraform.tfvars.preview"
```

## Variables

See `variables.tf` for all available variables. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `environment` | Environment name (`preview` or `production`) | Required |
| `vpc_id` | VPC ID where resources will be deployed | Required |
| `subnet_ids` | List of subnet IDs (at least 2 in different AZs) | Required |
| `pr_number` | PR number for preview environments | Optional |
| `ecs_cpu` | CPU units for ECS task (1024 = 1 vCPU) | `1024` |
| `ecs_memory` | Memory (MB) for ECS task | `2048` |
| `ecs_desired_count` | Desired number of ECS tasks | `1` |
| `ecr_repository_url` | ECR repository URL (if using ECR) | Optional |

## Outputs

After applying, use `terraform output` to get:
- ALB DNS name
- DynamoDB table names
- ECS cluster and service names
- IAM role ARNs

## Resource Naming

Resources are named using the pattern: `{project_name}-{environment}-{resource_type}`

For preview environments with PR numbers: `{project_name}-preview-pr{pr_number}-{resource_type}`

## Important Notes

1. **Sensitive Values**: Store sensitive environment variables in AWS Secrets Manager, not in Terraform variables.
2. **State Management**: Terraform state is managed via **S3 backend** to ensure idempotency and enable `destroy` operations.
   - State file keys are environment-specific: `production/terraform.tfstate`, `preview/pr-123/terraform.tfstate`
   - Backend configuration is provided via `-backend-config` during `terraform init`
   - This allows proper state management in CI/CD pipelines (GitHub Actions)
3. **S3 Backend Setup**: Before using Terraform, ensure the S3 bucket for state storage exists:
   ```bash
   aws s3 mb s3://routine-hub-terraform-state --region ap-northeast-1
   aws s3api put-bucket-versioning \
     --bucket routine-hub-terraform-state \
     --versioning-configuration Status=Enabled
   ```
4. **Cost**: Preview environments should be destroyed after PR merge/close to avoid unnecessary costs.
5. **Subnets**: Must be in different availability zones for high availability.

## S3 Backend Configuration

Terraform state is stored in S3 to ensure idempotency in CI/CD pipelines. The backend configuration is provided dynamically during `terraform init`:

**Production:**
```bash
terraform init \
  -backend-config="bucket=routine-hub-terraform-state" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="encrypt=true"
```

**Preview (PR-123):**
```bash
terraform init \
  -backend-config="bucket=routine-hub-terraform-state" \
  -backend-config="key=preview/pr-123/terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="encrypt=true"
```

This ensures:
- Each environment has its own state file
- State is persisted across CI/CD runs
- `terraform destroy` works correctly
- Idempotency is maintained

## Destroying Resources

To destroy a preview environment:
```bash
terraform destroy \
  -var="environment=preview" \
  -var="vpc_id=vpc-xxxxx" \
  -var="subnet_ids=[subnet-xxxxx,subnet-yyyyy]" \
  -var="pr_number=123"
```

**Warning**: This will destroy all resources in the environment. Make sure you have backups if needed.
