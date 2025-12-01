# Railway PR Preview Implementation Plan

## Overview

This plan sets up automatic PR preview environments using Railway. Each pull request will get:
- Isolated frontend deployment with unique URL
- Isolated backend API with unique URL  
- Isolated PostgreSQL database with fresh schema
- Automatic cleanup when PR is closed/merged

**Estimated Time:** 30-45 minutes

---

## Phase 1: Railway Account & Project Setup (Manual - 10 min)

### Step 1.1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up using your GitHub account (recommended for seamless integration)
3. Complete onboarding

### Step 1.2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `ai-built-recipe-app` repository
4. Railway will auto-detect your monorepo structure

### Step 1.3: Configure Services
Railway should detect both services. If not, manually create:

1. **Backend Service:**
   - Click "New Service" → "GitHub Repo"
   - Root Directory: `/backend`
   - Name: `api`

2. **Frontend Service:**
   - Click "New Service" → "GitHub Repo"  
   - Root Directory: `/frontend`
   - Name: `frontend`

3. **PostgreSQL Database:**
   - Click "New Service" → "Database" → "PostgreSQL"
   - Name: `postgres`

### Step 1.4: Enable PR Preview Environments
1. Go to Project Settings → Environments
2. Enable "PR Environments"
3. This automatically creates isolated environments for each PR

---

## Phase 2: Configuration Files (Code Changes)

### Step 2.1: Create Backend Railway Config

Create `backend/railway.toml`:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Step 2.2: Create Frontend Railway Config

Create `frontend/railway.toml`:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 100
```

### Step 2.3: Update Frontend Dockerfile for Dynamic API URL

The frontend needs to know the backend URL at build time. Update `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM --platform=linux/amd64 node:18-alpine as builder

WORKDIR /app

# Accept API URL as build arg (Railway sets this)
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM --platform=linux/amd64 nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

*(Note: This is already correct, just confirming)*

---

## Phase 3: Environment Variables (Railway Dashboard)

### Step 3.1: Backend Environment Variables

In Railway Dashboard → Backend Service → Variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
SESSION_SECRET=<generate-secure-secret>
CLIENT_URL=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
OPENAI_API_KEY=<your-openai-key>
```

Railway automatically provides:
- `RAILWAY_PUBLIC_DOMAIN` - The public URL for this service
- Variable references like `${{Postgres.DATABASE_URL}}` link services

### Step 3.2: Frontend Environment Variables

In Railway Dashboard → Frontend Service → Variables:

```
REACT_APP_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

### Step 3.3: Service Networking

In Railway Dashboard → Backend Service → Settings → Networking:
- Enable "Public Networking" 
- This exposes the backend API

In Railway Dashboard → Frontend Service → Settings → Networking:
- Enable "Public Networking"
- This exposes the frontend app

---

## Phase 4: Database Migration Setup

### Step 4.1: Update Backend Start Command

In Railway Dashboard → Backend Service → Settings → Deploy:

Set start command to:
```
npx prisma migrate deploy && node dist/index.js
```

Or update `backend/railway.toml`:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
startCommand = "npx prisma migrate deploy && node dist/index.js"
```

---

## Phase 5: GitHub Integration Enhancement (Optional)

### Step 5.1: Add PR Comment with Preview URLs

Railway automatically comments on PRs with deployment status. However, for a cleaner experience, you can add a custom GitHub Action.

Create `.github/workflows/railway-preview.yml`:

```yaml
name: Railway PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Comment PR with Preview Info
        uses: actions/github-script@v6
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const body = `## 🚂 Railway PR Preview
            
            Preview environments are being deployed by Railway.
            
            | Service | Status |
            |---------|--------|
            | Frontend | Deploying... |
            | Backend API | Deploying... |
            | Database | Deploying... |
            
            Railway will comment with live URLs once deployment is complete.
            
            *Preview environments are automatically destroyed when this PR is closed or merged.*`;
            
            // Check for existing comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber
            });
            
            const existingComment = comments.data.find(c => 
              c.body.includes('🚂 Railway PR Preview')
            );
            
            if (!existingComment) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body
              });
            }
```

---

## Phase 6: Testing the Setup

### Step 6.1: Create a Test PR

1. Create a new branch: `git checkout -b test/railway-preview`
2. Make a small change (e.g., update README)
3. Push and create PR
4. Watch Railway dashboard for deployment
5. Verify preview URLs work

### Step 6.2: Validate Full Stack

- [ ] Frontend loads at preview URL
- [ ] Frontend can reach backend API
- [ ] Database migrations ran successfully
- [ ] Authentication works (if applicable)
- [ ] Preview environment tears down after PR merge/close

---

## Cost Estimation

Railway pricing for PR previews:
- **Compute:** ~$0.000231/minute per service (~$0.01/hour)
- **Database:** ~$0.000231/minute (~$0.01/hour)
- **Storage:** First 1GB free, then $0.25/GB

**Typical PR preview cost:**
- 3 services running for 8 hours = ~$0.24
- Most PRs are reviewed and merged within hours
- Environments auto-sleep after inactivity (configurable)

**Monthly estimate:** If you have ~20 PRs averaging 8 hours each = ~$5/month

---

## Files to Create/Modify Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/railway.toml` | Create | Railway build/deploy config for backend |
| `frontend/railway.toml` | Create | Railway build/deploy config for frontend |
| `.github/workflows/railway-preview.yml` | Create (Optional) | Custom PR comment workflow |

---

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` uses `${{Postgres.DATABASE_URL}}` variable reference
- Check that database service is in the same Railway project

### Frontend Can't Reach Backend
- Verify backend has public networking enabled
- Check `REACT_APP_API_URL` is set correctly with `https://`
- Ensure CORS settings allow the frontend domain

### Migrations Not Running
- Check start command includes `npx prisma migrate deploy`
- Verify Prisma schema is included in Docker image
- Check Railway logs for migration errors

### Build Failures
- Railway uses your Dockerfiles by default
- Check Railway build logs for specific errors
- Ensure all build args are set

---

## Next Steps After Implementation

1. **Monitor costs** - Set up Railway spending alerts
2. **Optimize** - Configure auto-sleep for preview environments
3. **Seed data** - Consider adding seed script for test data in previews
4. **Custom domains** - Optionally set up custom domains for production on Railway

---

## Quick Reference

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs - PR Environments:** https://docs.railway.app/develop/environments#pr-environments
- **Railway Docs - Monorepos:** https://docs.railway.app/develop/services#monorepo-configuration