# Authentication Timeout Extension Plan

## Objective
Extend user authentication session timeout from 24 hours to 30 days for all users.

## Current State
- Authentication timeout is configured in `backend/src/server.ts` line 78
- Current value: `maxAge: 24 * 60 * 60 * 1000` (24 hours)
- Uses cookie-session middleware with signed, secure cookies

## Implementation

### Single Change Required
**File**: `backend/src/server.ts`
**Line**: 78
**Current**: `maxAge: 24 * 60 * 60 * 1000, // 24 hours`
**New**: `maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days`

### Technical Details
- New timeout value: 2,592,000,000 milliseconds (30 days)
- Existing security measures remain in place:
  - `httpOnly: true` - Prevents XSS attacks
  - `signed: true` - Prevents cookie tampering
  - `secure: true` in production - HTTPS only
  - `sameSite` protection - CSRF protection

### Security Considerations
- Longer sessions increase exposure time if device is compromised
- Existing cookie security measures mitigate most risks
- Users can still logout immediately to invalidate sessions
- Signed cookies prevent unauthorized modification

### Testing
1. Verify session persists beyond 24 hours
2. Confirm logout functionality still works
3. Test in both development and production environments

## Implementation Steps
1. Update the `maxAge` value in cookie configuration
2. Test the change in development environment
3. Deploy to production

## Files Modified
- `backend/src/server.ts` (line 78)

## Expected Outcome
Users will remain authenticated for 30 days instead of 24 hours, reducing the frequency of re-authentication while maintaining security.