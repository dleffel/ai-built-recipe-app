# Deployment Strategy

## Environment Configuration

### Frontend (recipes.dannyleffel.com)
- Service: App Runner (recipe-app-frontend)
- Environment Variables:
  ```
  NODE_ENV=production
  REACT_APP_API_URL=https://api.recipes.dannyleffel.com
  ```

### Backend (api.recipes.dannyleffel.com)
- Service: App Runner (recipe-app-api)
- Environment Variables:
  ```
  NODE_ENV=production
  DATABASE_URL=postgresql://recipeadmin:[password]@recipe-app-db.cuxc1uelbvof.us-east-1.rds.amazonaws.com:5432/recipe_app
  GOOGLE_CLIENT_ID=[client-id]
  GOOGLE_CLIENT_SECRET=[client-secret]
  REDIRECT_URL=https://api.recipes.dannyleffel.com/auth/google/callback
  SESSION_SECRET=[session-secret]
  COOKIE_KEY=[cookie-key]
  OPENAI_API_KEY=[openai-key]
  ```

## Automatic Deployments

### Frontend (recipes.dannyleffel.com)
- Service: App Runner (recipe-app-frontend)
- Trigger: Push to main branch
- Process:
  1. Build new Docker image
  2. Push to ECR with :latest tag
  3. App Runner automatically deploys the new image
  4. Health check at / endpoint verifies deployment

### Backend (api.recipes.dannyleffel.com)
- Service: App Runner (recipe-app-api)
- Trigger: Push to main branch
- Process:
  1. Build new Docker image
  2. Push to ECR with :latest tag
  3. App Runner automatically deploys the new image
  4. Health check at /api/health endpoint verifies deployment

## Database Migrations

### Migration Process
1. Migrations should be created and tested locally first:
   ```bash
   cd backend
   npx prisma migrate dev --name your_migration_name
   ```

2. Before deploying:
   - Commit migration files to the repository
   - Run full test suite to verify changes
   - Push to main branch

3. During deployment:
   - The backend's docker-entrypoint.sh script runs migrations automatically:
     ```bash
     # Excerpt from docker-entrypoint.sh
     npx prisma migrate deploy
     ```
   - This ensures migrations run before the API server starts

4. Rollback strategy:
   - Prisma migrations are versioned and tracked in the database
   - To rollback, create a new migration that reverses the changes
   - Deploy the rollback migration using the same process

## Test Verification

### Pre-deployment Tests
1. Run unit tests:
   ```bash
   # Frontend
   cd frontend
   npm test

   # Backend
   cd backend
   npm test
   ```

2. Run integration tests:
   ```bash
   cd backend
   npm run test:integration
   ```

### Post-deployment Verification
1. Health check endpoints automatically verify basic service availability:
   - Frontend: https://recipes.dannyleffel.com/health
   - Backend: https://api.recipes.dannyleffel.com/api/health

2. Manual verification steps:
   - Verify frontend loads at https://recipes.dannyleffel.com
   - Verify API endpoints at https://api.recipes.dannyleffel.com
   - Test critical user flows (login, recipe creation, etc.)

## Monitoring and Rollback

### Monitoring
- App Runner provides built-in monitoring:
  - CPU and memory utilization
  - Request counts and latency
  - Error rates and logs
  - VPC connectivity status

### Rollback Process
1. If issues are detected:
   ```bash
   # Revert to previous image
   aws apprunner start-deployment \
     --service-arn [service-arn] \
     --source-configuration '{
       "ImageRepository": {
         "ImageIdentifier": "[previous-image-tag]"
       }
     }'
   ```

2. For database issues:
   - Deploy rollback migration if needed
   - Verify data integrity
   - Update application code if necessary

## Security Considerations

1. SSL/TLS:
   - All traffic is encrypted using AWS-managed certificates
   - Certificate renewal is automatic

2. Environment Variables:
   - Sensitive values are stored in App Runner service configuration
   - Never commit sensitive values to the repository
   - Production values are managed through AWS console

3. Network Security:
   - Frontend: Public access, no VPC connection needed
   - Backend: VPC connector configured for database access
   - All external requests must use HTTPS

4. Authentication:
   - Google OAuth configured for user authentication
   - Session management using secure cookies
   - CORS configured to allow only frontend domain