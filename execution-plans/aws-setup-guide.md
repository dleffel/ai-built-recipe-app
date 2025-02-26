# AWS Setup Guide for Recipe App Deployment

## Prerequisites
1. AWS Account with administrative access
2. AWS CLI installed and configured
3. GitHub repository with the application code

## Initial Setup Steps

### 1. Create ECR Repositories
```bash
# Create frontend repository
aws ecr create-repository \
  --repository-name recipe-app-frontend \
  --image-scanning-configuration scanOnPush=true

# Create backend repository
aws ecr create-repository \
  --repository-name recipe-app-backend \
  --image-scanning-configuration scanOnPush=true
```

### 2. Create IAM Role for GitHub Actions
1. Create a new IAM role with the following permissions:
   - ECR push/pull access
   - App Runner deployment permissions
   - Systems Manager Parameter Store read access
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ecr:GetAuthorizationToken",
           "ecr:BatchCheckLayerAvailability",
           "ecr:GetDownloadUrlForLayer",
           "ecr:GetRepositoryPolicy",
           "ecr:DescribeRepositories",
           "ecr:ListImages",
           "ecr:DescribeImages",
           "ecr:BatchGetImage",
           "ecr:InitiateLayerUpload",
           "ecr:UploadLayerPart",
           "ecr:CompleteLayerUpload",
           "ecr:PutImage"
         ],
         "Resource": "*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "apprunner:UpdateService",
           "apprunner:DescribeService",
           "apprunner:ListServices"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

2. Configure OIDC provider for GitHub Actions:
   - Provider URL: https://token.actions.githubusercontent.com
   - Audience: sts.amazonaws.com

### 3. Set up GitHub Secrets
Required secrets in GitHub repository:
- `AWS_ROLE_ARN`: ARN of the IAM role created above
- `DATABASE_URL`: RDS connection string

### 4. Configure App Runner Services

#### Backend Service
```bash
aws apprunner create-service \
  --service-name recipe-app-backend \
  --source-configuration '{
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::ACCOUNT_ID:role/AppRunnerECRAccessRole"
    },
    "ImageRepository": {
      "ImageIdentifier": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/recipe-app-backend:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "3000",
          "DATABASE_URL": "postgresql://user:pass@host:5432/db"
        }
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }' \
  --network-configuration '{
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "YOUR_VPC_CONNECTOR_ARN"
    }
  }'
```

#### Frontend Service
```bash
aws apprunner create-service \
  --service-name recipe-app-frontend \
  --source-configuration '{
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::ACCOUNT_ID:role/AppRunnerECRAccessRole"
    },
    "ImageRepository": {
      "ImageIdentifier": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/recipe-app-frontend:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "80",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "REACT_APP_API_URL": "https://api.recipes.dannyleffel.com"
        }
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }'
```

### 5. Configure Custom Domains

1. Create SSL certificate in ACM:
```bash
aws acm request-certificate \
  --domain-names "*.recipes.dannyleffel.com" \
  --validation-method DNS
```

2. Add DNS records for validation

3. Associate domains with App Runner services:
```bash
# Frontend
aws apprunner associate-custom-domain \
  --service-arn YOUR_FRONTEND_SERVICE_ARN \
  --domain-name recipes.dannyleffel.com

# Backend
aws apprunner associate-custom-domain \
  --service-arn YOUR_BACKEND_SERVICE_ARN \
  --domain-name api.recipes.dannyleffel.com
```

## Maintenance

### Monitoring
- Set up CloudWatch alarms for:
  - Service health
  - Response times
  - Error rates
  - CPU/Memory utilization

### Logging
- App Runner logs are automatically sent to CloudWatch
- Access logs at:
  - /aws/apprunner/recipe-app-frontend/
  - /aws/apprunner/recipe-app-backend/

### Scaling
- App Runner automatically scales based on traffic
- Configure scaling in App Runner console if needed

### Database Migrations
- Migrations run automatically during deployment
- Manual migration command if needed:
  ```bash
  npx prisma migrate deploy
  ```

## Security Considerations

1. Network Security
   - Backend service in VPC
   - Database access restricted to VPC
   - Frontend publicly accessible

2. Authentication
   - ECR access via IAM roles
   - GitHub Actions using OIDC
   - Database credentials in Secrets Manager

3. Monitoring
   - CloudWatch logs enabled
   - Health checks configured
   - SSL/TLS encryption enabled