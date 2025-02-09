# Simplified Testing Strategy

## Current Issues
- Tests are too complex and brittle
- Too much mocking of internal implementation
- Focus on coverage numbers rather than value
- Tests break when implementation details change

## Proposed Approach

### 1. Focus on Key User Flows
Instead of testing every internal function and state change, focus on key user flows:
- User can log in with Google
- User can log out
- User can see their profile when logged in
- User can see login page when not logged in

### 2. Integration Tests Over Unit Tests
- Test components in context of how they're actually used
- Minimize mocking to only external dependencies (Google OAuth)
- Use real AuthContext and API calls in tests where possible
- Focus on user-visible behavior

### 3. Simplified Mocking Strategy
Only mock:
- External API calls
- OAuth redirects
- Environment variables

### 4. Test Structure
```typescript
describe('Authentication Flow', () => {
  it('shows login page when not authenticated')
  it('can log in with Google')
  it('shows user profile when authenticated')
  it('can log out')
})
```

### 5. Implementation Plan

1. Create test environment setup:
```typescript
// test-utils.ts
export function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
}
```

2. Mock only necessary external dependencies:
```typescript
// setupTests.ts
const mockApi = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('./services/api', () => mockApi);
```

3. Write integration tests focusing on user flows:
```typescript
describe('Authentication', () => {
  it('shows login page for unauthenticated users', () => {
    renderWithAuth(<App />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('shows user profile after successful login', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { displayName: 'Test User' }
    });
    
    renderWithAuth(<App />);
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

### 6. Benefits
- Tests are easier to understand and maintain
- Less likely to break with implementation changes
- Better test coverage of actual user scenarios
- Faster test development and maintenance
- More confidence in test results

### 7. Next Steps
1. Create test-utils.ts with helper functions
2. Update setupTests.ts to minimal mocking
3. Remove complex mocking from existing tests
4. Rewrite tests focusing on user flows
5. Add integration tests for key features

### 8. Coverage Goals
Instead of aiming for arbitrary coverage numbers:
- 100% coverage of key user flows
- 100% coverage of critical business logic
- Acceptance criteria covered by tests
- Edge cases and error handling tested

This approach will give us more meaningful test coverage while being easier to maintain.