# Timezone Fix for Task Rollover

## Problem
The task rollover feature was rolling tasks to one day earlier than expected, and the timezone tests were failing in GitHub Actions CI but passing locally.

## Root Cause
**Environment timezone mismatch:**
- **Local environment:** Runs in `America/Los_Angeles` timezone → date-fns-tz conversions work correctly
- **CI/Production:** Defaults to UTC timezone → date-fns-tz conversions fail → wrong day calculations

## Solution Implemented

### 1. Jest Tests (✅ Fixed)
Set `TZ=America/Los_Angeles` in [`backend/test/setup-env.js`](backend/test/setup-env.js)

### 2. GitHub Actions CI (✅ Fixed)
Added `TZ: America/Los_Angeles` environment variable to the test job in [`.github/workflows/main.yml`](.github/workflows/main.yml)

### 3. Production Environment (⚠️ ACTION REQUIRED)

You need to add the `TZ` environment variable to your AWS App Runner backend service:

**Option A: Via AWS Console**
1. Go to AWS App Runner console
2. Select your backend service: `recipe-app-api`
3. Click "Configuration" → "Environment variables"
4. Add new environment variable:
   - **Name:** `TZ`
   - **Value:** `America/Los_Angeles`
5. Deploy the changes

**Option B: Via AWS CLI**
```bash
# Get current environment variables
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:959015000320:service/recipe-app-api/af3d019dde794fdd92dd619da3d0d357 \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables' \
  --output json > current_env.json

# Add TZ variable to current_env.json
# Then update the service with the new environment variables
```

**Option C: Update GitHub Actions Workflow**
You can also add the TZ variable to the App Runner deployment step in `.github/workflows/main.yml` where other environment variables are set (around line 120).

## Additional Improvements
Also fixed a potential date overflow bug by replacing `new Date()` followed by individual `setUTC*()` calls with `Date.UTC()` constructor in:
- [`getStartOfDayPT()`](backend/src/utils/timezoneUtils.ts:66)
- [`getEndOfDayPT()`](backend/src/utils/timezoneUtils.ts:88)

This prevents issues when the system date is (e.g., May 31st) and we try to set it to April (which only has 30 days), causing month overflow.

## Testing
After deploying to production:
1. Monitor the next scheduled task rollover
2. Verify tasks roll over to the correct day in Pacific Time
3. Check that no tasks are rolling to the previous day anymore