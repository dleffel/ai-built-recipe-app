# AWS Credentials and Environment Variables Setup

## Required Credentials

### 1. AWS IAM User Credentials
These credentials will be used for GitHub Actions deployment:
```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-west-2
```

Required IAM Permissions:
- AWSAppRunnerFullAccess
- AmazonRDSFullAccess
- SecretsManagerReadWrite
- AmazonECR_FullAccess

### 2. Database Configuration
After RDS setup, you'll need:
```
DATABASE_URL=postgresql://<username>:<password>@<rds-endpoint>:5432/<database-name>
```

### 3. Application Environment Variables
These will be configured in App Runner:

Frontend:
```
REACT_APP_API_URL=https://api.recipes.dannyleffel.com
NODE_ENV=production
```

Backend:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=<from-above>
SESSION_SECRET=<random-string>
```

## Setup Steps

1. Create IAM User:
   - Go to AWS IAM Console
   - Create new user with programmatic access
   - Attach required policies
   - Save access key and secret key

2. Add GitHub Secrets:
   - Go to GitHub repository settings
   - Add the following secrets:
     * AWS_ACCESS_KEY_ID
     * AWS_SECRET_ACCESS_KEY
     * DATABASE_URL (after RDS setup)

3. Configure App Runner:
   - Environment variables will be set during service creation
   - Secrets will be managed through AWS Secrets Manager

## Security Notes

- Never commit credentials to the repository
- Use AWS Secrets Manager for sensitive values
- Rotate access keys periodically
- Use least-privilege principle for IAM permissions