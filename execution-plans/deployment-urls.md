# Deployment URLs and Configuration

## Service URLs

### Backend Service
- Service Name: recipe-app-backend
- Temporary URL: https://zcy27i9fer.us-east-1.awsapprunner.com
- Custom Domain (pending): https://api.recipes.dannyleffel.com

### Frontend Service
- Service Name: recipe-app-frontend
- Temporary URL: https://piqpgv6sju.us-east-1.awsapprunner.com
- Custom Domain (pending): https://recipes.dannyleffel.com

## DNS Configuration Required

1. SSL Certificate Validation Records (already documented in dns-records.md)

2. Service Domain Records (to be created after certificate validation):
   ```
   CNAME recipes.dannyleffel.com -> piqpgv6sju.us-east-1.awsapprunner.com
   CNAME api.recipes.dannyleffel.com -> zcy27i9fer.us-east-1.awsapprunner.com
   ```

## Infrastructure Summary

### Backend
- App Runner service with VPC connector
- Connected to RDS database
- Environment variables configured
- Health check at /health endpoint
- Auto-scaling enabled

### Frontend
- App Runner service
- Nginx-based static file serving
- Environment variables configured
- Health check at / endpoint
- Auto-scaling enabled

### Shared Infrastructure
- ECR repositories for both services
- IAM roles and policies configured
- SSL certificate pending validation
- VPC connector for database access

## Next Steps

1. Wait for certificate validation
2. Configure custom domains in App Runner
3. Push initial Docker images
4. Verify deployments
5. Set up monitoring and alerts

## Important Notes

- Keep these URLs for future reference
- Monitor service status in AWS Console
- Check logs in CloudWatch
- Watch for any deployment or health check issues
- Ensure database migrations run successfully