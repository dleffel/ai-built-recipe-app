# Final Deployment Checklist

## 1. GitHub Repository Secrets Setup
- [ ] Add AWS_ACCESS_KEY_ID: AKIA56SN7TEAFMYSWAC3
- [ ] Add AWS_SECRET_ACCESS_KEY: (from previous setup)
- [ ] Add AWS_REGION: us-east-1
- [ ] Add DATABASE_URL: postgresql://recipeadmin:G7cr5IT3sypOrJCx@recipe-app-db.cuxc1uelbvof.us-east-1.rds.amazonaws.com:5432/recipe_app

## 2. App Runner Setup
### Backend Service
- [ ] Create App Runner service for backend
- [ ] Configure environment variables:
  - [ ] NODE_ENV=production
  - [ ] PORT=3000
  - [ ] DATABASE_URL (from secrets)
  - [ ] SESSION_SECRET (from secrets)
- [ ] Enable automatic deployments from main branch
- [ ] Configure health check endpoint

### Frontend Service
- [ ] Create App Runner service for frontend
- [ ] Configure environment variables:
  - [ ] NODE_ENV=production
  - [ ] REACT_APP_API_URL=https://api.recipes.dannyleffel.com
- [ ] Enable automatic deployments from main branch
- [ ] Configure health check endpoint

## 3. DNS and SSL Setup
- [ ] Request SSL certificate in AWS Certificate Manager
- [ ] Create CNAME record for recipes.dannyleffel.com
- [ ] Create CNAME record for api.recipes.dannyleffel.com
- [ ] Configure custom domains in App Runner services
- [ ] Verify SSL certificate validation

## 4. Initial Deployment
- [ ] Push code to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Verify frontend deployment
- [ ] Verify backend deployment
- [ ] Confirm database migrations run successfully

## 5. Monitoring Setup
- [ ] Set up CloudWatch dashboard
- [ ] Configure alerts for:
  - [ ] Error rates
  - [ ] Response times
  - [ ] CPU/Memory utilization
  - [ ] Database metrics
- [ ] Set up logging aggregation
- [ ] Configure error notifications

## 6. Post-Deployment Verification
- [ ] Test frontend application at https://recipes.dannyleffel.com
- [ ] Test backend API at https://api.recipes.dannyleffel.com
- [ ] Verify database connections
- [ ] Check all application features
- [ ] Monitor error logs
- [ ] Test automatic scaling

## 7. Documentation
- [ ] Update README with deployment information
- [ ] Document rollback procedures
- [ ] Document monitoring and alerting setup
- [ ] Create runbook for common operations

## Notes
- Keep AWS access keys secure and never commit them to the repository
- Monitor AWS costs during initial deployment
- Consider setting up budget alerts
- Plan for regular security updates and maintenance
- Document any manual steps for future reference