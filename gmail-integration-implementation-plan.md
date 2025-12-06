# Gmail Integration Implementation Plan

## Overview

This document outlines the implementation of a Gmail monitoring system that integrates with Gmail accounts via OAuth, uses Gmail Pub/Sub for real-time email notifications, and triggers actions for each new email. The system supports monitoring the primary account (auto-enrolled on login) and connecting multiple secondary Gmail accounts.

## Implementation Status

### Phase 1: Database and Core Infrastructure - COMPLETED

Files created:
- `backend/prisma/schema.prisma` - Added GmailAccount and GmailWatch models
- `backend/prisma/migrations/20251206180000_add_gmail_models/migration.sql` - Database migration
- `backend/src/types/gmail.ts` - TypeScript type definitions
- `backend/src/utils/encryption.ts` - Token encryption utilities (AES-256-GCM)
- `backend/src/services/gmailAccountService.ts` - Gmail account CRUD operations

### Phase 2: Gmail OAuth Integration - COMPLETED

Files created:
- `backend/src/services/gmailOAuthService.ts` - OAuth token management
- `backend/src/routes/gmail.ts` - Gmail API routes

### Phase 3: Gmail Pub/Sub Integration - COMPLETED

Files created:
- `backend/src/services/gmailWatchService.ts` - Gmail watch subscription management
- `backend/src/services/gmailPubSubService.ts` - Pub/Sub notification processing
- `backend/src/routes/webhooks.ts` - Webhook endpoint for Pub/Sub

### Phase 4: Email Processing and Action Handler - COMPLETED

Files created:
- `backend/src/services/gmailHistoryService.ts` - Gmail History API for incremental sync
- `backend/src/services/emailActionHandler.ts` - Email action handler (POC: console logging)

### Phase 5: Watch Renewal Scheduler - COMPLETED

Files modified:
- `backend/src/server.ts` - Added Gmail routes, webhook routes, and watch renewal scheduler

### Phase 6: Frontend UI - COMPLETED

Files created:
- `frontend/src/types/gmail.ts` - Frontend TypeScript interfaces
- `frontend/src/services/gmailApi.ts` - API client service
- `frontend/src/components/gmail/GmailSettings.tsx` - Gmail settings component
- `frontend/src/components/gmail/GmailSettings.module.css` - Styles
- `frontend/src/components/gmail/index.ts` - Component exports

## Data Model

### GmailAccount
```prisma
model GmailAccount {
  id              String    @id @default(uuid())
  email           String    // Gmail address
  isPrimary       Boolean   @default(false)
  isActive        Boolean   @default(true)
  accessToken     String    // Encrypted OAuth access token
  refreshToken    String    // Encrypted OAuth refresh token
  tokenExpiresAt  DateTime
  historyId       String?   // Gmail history ID for incremental sync
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastSyncAt      DateTime?
  userId          String
  user            User      @relation(...)
  watches         GmailWatch[]
}
```

### GmailWatch
```prisma
model GmailWatch {
  id              String    @id @default(uuid())
  resourceId      String    // Gmail watch resource ID
  expiration      DateTime  // Watch expiration time
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  gmailAccountId  String
  gmailAccount    GmailAccount @relation(...)
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/accounts` | List connected Gmail accounts |
| POST | `/api/gmail/accounts/connect` | Initiate OAuth flow for new account |
| GET | `/api/gmail/callback` | OAuth callback handler |
| POST | `/api/gmail/accounts/:id/activate` | Activate monitoring |
| POST | `/api/gmail/accounts/:id/deactivate` | Deactivate monitoring |
| DELETE | `/api/gmail/accounts/:id` | Disconnect a Gmail account |
| POST | `/webhooks/gmail/pubsub` | Pub/Sub webhook endpoint |

## Environment Variables

Add to `.env`:

```env
# Gmail Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GMAIL_PUBSUB_TOPIC=projects/{project-id}/topics/gmail-notifications
GMAIL_TOKEN_ENCRYPTION_KEY=<64-character-hex-key>
```

## Google Cloud Setup Requirements

### 1. Enable APIs
- Gmail API
- Cloud Pub/Sub API

### 2. Create Pub/Sub Topic
```bash
gcloud pubsub topics create gmail-notifications
```

### 3. Grant Gmail Permission to Publish
```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

### 4. Create Push Subscription
```bash
gcloud pubsub subscriptions create gmail-push-subscription \
  --topic=gmail-notifications \
  --push-endpoint=https://your-backend-url/webhooks/gmail/pubsub \
  --ack-deadline=60
```

### 5. Update OAuth Consent Screen
Add Gmail scopes to the OAuth consent screen configuration:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.metadata`

## Deployment Steps

1. Run Prisma migration: `npx prisma migrate deploy`
2. Generate Prisma client: `npx prisma generate`
3. Install new dependency: `npm install googleapis`
4. Set environment variables
5. Configure Google Cloud Pub/Sub
6. Deploy backend changes
7. Deploy frontend changes

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted at rest using AES-256-GCM
2. **Webhook Verification**: Verify Pub/Sub messages are from Google
3. **Scope Minimization**: Request only necessary Gmail scopes
4. **Token Refresh**: Automatically refresh expired access tokens
5. **User Authorization**: Ensure users can only access their own Gmail accounts

## Future Enhancements

1. **Email Content Processing**: Parse email bodies for CRM data extraction
2. **Contact Matching**: Match email addresses to CRM contacts
3. **Activity Timeline**: Log email interactions on contact records
4. **Smart Categorization**: Use AI to categorize emails
5. **Batch Processing**: Handle high-volume email accounts efficiently
6. **Error Recovery**: Implement retry logic for failed webhook processing