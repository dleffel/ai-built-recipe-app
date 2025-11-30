# Service Base Class Refactor Plan

## Executive Summary
Create a base service class to eliminate duplicated Prisma instance management code across all backend services, improving maintainability and establishing a consistent pattern for future services.

## Problem Identified

### Code Duplication Pattern
All three backend service classes ([`UserService`](backend/src/services/userService.ts:6), [`RecipeService`](backend/src/services/recipeService.ts:19), and [`TaskService`](backend/src/services/taskService.ts:28)) contain identical boilerplate code:

```typescript
static prisma: PrismaClient = defaultPrisma;

static resetPrisma() {
  this.prisma = defaultPrisma;
}
```

This violates the DRY (Don't Repeat Yourself) principle and creates maintenance burden.

## Impact Assessment

### High Impact Benefits
1. **Eliminates Duplication**: Removes 6 lines of duplicate code across 3 files
2. **Improves Maintainability**: Changes to Prisma instance management only need to happen in one place
3. **Establishes Pattern**: Creates a foundation for other shared service functionality
4. **Eases Future Development**: New services automatically inherit Prisma management
5. **Better Code Organization**: Clear separation of common infrastructure vs. domain-specific logic

### Low Risk Factors
1. **No Business Logic Changes**: Pure structural refactor with no behavioral changes
2. **TypeScript Safety**: Compiler will catch any issues during refactor
3. **Comprehensive Test Suite**: Existing tests will validate functionality is preserved
4. **Small Scope**: Only affects 4 files (3 services + 1 new base class)
5. **No API Changes**: External interfaces remain identical

## Implementation Plan

### Step 1: Create Base Service Class
**File**: `backend/src/services/BaseService.ts`

```typescript
import { prisma as defaultPrisma } from '../lib/prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * Base service class providing common Prisma instance management.
 * All service classes should extend this to inherit standard data access patterns.
 */
export abstract class BaseService {
  /**
   * Prisma client instance. Can be overridden in tests for mocking.
   */
  static prisma: PrismaClient = defaultPrisma;

  /**
   * Reset the Prisma instance to the default client.
   * Primarily used in test cleanup.
   */
  static resetPrisma(): void {
    this.prisma = defaultPrisma;
  }
}
```

### Step 2: Update UserService
**File**: [`backend/src/services/userService.ts`](backend/src/services/userService.ts)

**Changes**:
- Import `BaseService`
- Extend `BaseService` instead of standalone class
- Remove duplicate `prisma` property and `resetPrisma()` method

**Before**:
```typescript
export class UserService {
  // Allow overriding prisma in tests
  static prisma: PrismaClient = defaultPrisma;

  // Add method to reset prisma instance (for tests)
  static resetPrisma() {
    this.prisma = defaultPrisma;
  }
  
  // ... methods ...
}
```

**After**:
```typescript
export class UserService extends BaseService {
  // ... methods only ...
}
```

### Step 3: Update RecipeService
**File**: [`backend/src/services/recipeService.ts`](backend/src/services/recipeService.ts)

**Changes**:
- Import `BaseService`
- Extend `BaseService`
- Remove duplicate `prisma` property and `resetPrisma()` method

### Step 4: Update TaskService  
**File**: [`backend/src/services/taskService.ts`](backend/src/services/taskService.ts)

**Changes**:
- Import `BaseService`
- Extend `BaseService`
- Remove duplicate `prisma` property and `resetPrisma()` method

### Step 5: Verification
1. **Run TypeScript Compiler**: Ensure no type errors
2. **Run All Tests**: Verify all existing tests pass
3. **Manual Testing**: Test key user flows (auth, recipes, tasks)

## Testing Strategy

### Existing Test Coverage
All services have comprehensive test suites that will validate the refactor:
- [`backend/src/__tests__/userService.unit.test.ts`](backend/src/__tests__/userService.unit.test.ts)
- [`backend/src/__tests__/recipeService.unit.test.ts`](backend/src/__tests__/recipeService.unit.test.ts)
- [`backend/src/__tests__/taskService.timezone.test.ts`](backend/src/__tests__/taskService.timezone.test.ts)
- Integration tests in [`backend/src/__tests__/`](backend/src/__tests__/)

### What Tests Validate
- ✅ All service methods still work correctly
- ✅ Prisma instance is accessible via `this.prisma`
- ✅ `resetPrisma()` method is available for test cleanup
- ✅ Test mocking capabilities are preserved

## Rollback Plan
If issues arise:
1. Revert the 4 file changes (git revert)
2. Services immediately return to their original working state
3. No database or API changes to rollback

## Future Opportunities
This base class can be extended to include:
- Common error handling patterns
- Logging utilities
- Transaction helpers
- Soft delete patterns
- Audit trail functionality
- Common query builders

## Files Modified
1. ✨ **NEW**: `backend/src/services/BaseService.ts`
2. 📝 `backend/src/services/userService.ts`
3. 📝 `backend/src/services/recipeService.ts`
4. 📝 `backend/src/services/taskService.ts`

## Estimated Effort
- **Implementation**: 15-20 minutes
- **Testing**: 10 minutes
- **Total**: ~30 minutes

## Success Criteria
- [ ] All TypeScript compilation succeeds
- [ ] All existing tests pass
- [ ] No duplicate Prisma management code in services
- [ ] All services extend BaseService
- [ ] Code is cleaner and more maintainable