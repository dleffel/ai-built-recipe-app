# GitHub Actions AWS Authentication Setup

## Overview
We're using GitHub Actions OIDC (OpenID Connect) for secure, short-lived AWS credentials instead of long-term access keys.

## Setup Steps

### 1. Create GitHub OIDC Provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

### 2. Create IAM Role

1. Create a new role with the following trust relationship:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::959015000320:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:danielleffel/ai-built-recipe-app:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

2. Attach these policies to the role:
   - AWSAppRunnerFullAccess
   - AmazonECR_FullAccess
   - AmazonRDSFullAccess
   - SecretsManagerReadWrite

### 3. Add Role ARN to GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables → Actions
3. Add a new secret:
   - Name: `AWS_ROLE_ARN`
   - Value: `arn:aws:iam::[YOUR-ACCOUNT-ID]:role/[ROLE-NAME]`

## Validation Steps

1. Check OIDC provider exists:
```bash
aws iam list-open-id-connect-providers
```

2. Verify role trust relationship:
```bash
aws iam get-role --role-name [ROLE-NAME]
```

3. Test role assumption:
```bash
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::[YOUR-ACCOUNT-ID]:role/[ROLE-NAME] \
  --web-identity-token [TOKEN] \
  --role-session-name "TestSession"
```

## Troubleshooting

If you see "Could not load credentials from any providers", check:

1. OIDC provider configuration:
   - Correct URL (https://token.actions.githubusercontent.com)
   - Correct thumbprint
   - Correct client ID

2. Role trust relationship:
   - Correct repository name
   - Correct branch reference
   - Correct account ID

3. GitHub workflow permissions:
   - `permissions.id-token: write` is set
   - `permissions.contents: read` is set

4. GitHub secret:
   - AWS_ROLE_ARN is correctly set
   - Role exists and has correct permissions