# GitHub Secrets Configuration

The following secrets need to be configured in your GitHub repository settings for the CI/CD pipeline to work correctly.

## AWS Credentials
- `AWS_ACCESS_KEY_ID`: The access key ID for the recipe-app-deployer IAM user
- `AWS_SECRET_ACCESS_KEY`: The secret access key for the recipe-app-deployer IAM user
- `AWS_REGION`: us-east-1

## Database Configuration
- `DATABASE_URL`: The connection string for the RDS instance
  Format: `postgresql://recipeadmin:${PASSWORD}@recipe-app-db.cuxc1uelbvof.us-east-1.rds.amazonaws.com:5432/recipe_app`

## Application Secrets
These are stored in AWS Secrets Manager but also needed in GitHub Secrets for the build process:
- `SESSION_SECRET`: Retrieved from AWS Secrets Manager (recipe-app/application)
- `NODE_ENV`: production

## Container Registry
The following ECR repositories have been created:
- Frontend: 959015000320.dkr.ecr.us-east-1.amazonaws.com/recipe-app-frontend
- Backend: 959015000320.dkr.ecr.us-east-1.amazonaws.com/recipe-app-backend

## Steps to Configure

1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables > Actions
3. Add each of the above secrets using the "New repository secret" button
4. Ensure all secrets are added before running any workflows

## Security Notes

- Never commit these secrets to the repository
- Rotate the AWS access keys periodically
- Use AWS Secrets Manager for additional secrets needed by the application
- Monitor AWS CloudWatch for any unusual activity

## Next Steps

1. Add these secrets to your GitHub repository
2. Push code to main branch to trigger the CI/CD pipeline
3. Monitor the GitHub Actions workflow
4. Verify the deployment in AWS App Runner console