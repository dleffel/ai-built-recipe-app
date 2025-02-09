# Test Coverage Needed

## Backend Tests Needed

### 1. Passport Configuration (src/config/passport.ts)
- Test user serialization/deserialization
- Test Google strategy configuration
- Test mock user creation in development mode
- Test user store management

### 2. Auth Routes (src/routes/auth.ts)
- Test Google OAuth routes
- Test development login route
- Test current-user endpoint
- Test logout functionality
- Test error handling scenarios

### 3. Session Handling
- Test cookie-session configuration
- Test session persistence
- Test session clearing on logout

## Frontend Tests Needed

### 1. Auth Context (src/context/AuthContext.tsx)
- Test user state management
- Test loading states
- Test error handling
- Test login/logout functionality

### 2. Login Component (src/components/Login.tsx)
- Test component rendering
- Test Google login button visibility
- Test development login button visibility
- Test user profile display
- Test logout button functionality

### 3. API Service (src/services/api.ts)
- Test API configuration
- Test error interceptor
- Test authentication header handling

## Test Plan
1. Create backend tests first since they're critical for security
2. Add frontend component tests
3. Add integration tests for the complete auth flow

## Coverage Requirements
As per package.json, we need to maintain:
- 80% branch coverage
- 80% function coverage
- 80% line coverage
- 80% statement coverage

## Next Steps
1. Create test files for each new component
2. Mock external dependencies (Google OAuth, session handling)
3. Test both success and failure scenarios
4. Ensure development-only features are properly tested