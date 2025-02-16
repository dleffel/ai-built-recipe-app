# Required Service Changes for Test Restructuring

## RecipeService Changes

```typescript
import { prisma as defaultPrisma } from '../lib/prisma';
import type { Recipe, PrismaClient } from '@prisma/client';

export class RecipeService {
  // Allow overriding prisma in tests
  static prisma: PrismaClient = defaultPrisma;

  // Add method to reset prisma instance (for tests)
  static resetPrisma() {
    this.prisma = defaultPrisma;
  }

  // Update all methods to use this.prisma instead of prisma directly
  static async createRecipe(userId: string, data: CreateRecipeDTO): Promise<Recipe> {
    return this.prisma.recipe.create({
      data: {
        ...data,
        userId
      }
    });
  }

  // ... same for all other methods
}
```

## UserService Changes

```typescript
import { prisma as defaultPrisma } from '../lib/prisma';
import type { User, PrismaClient } from '@prisma/client';

export class UserService {
  // Allow overriding prisma in tests
  static prisma: PrismaClient = defaultPrisma;

  // Add method to reset prisma instance (for tests)
  static resetPrisma() {
    this.prisma = defaultPrisma;
  }

  // Update all methods to use this.prisma instead of prisma directly
  static async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  // ... same for all other methods
}
```

## Benefits

1. **Testability**: Services can be tested in isolation by injecting a mock Prisma client
2. **Consistency**: All database access goes through the same prisma instance
3. **Reset Capability**: Tests can easily reset to the default prisma instance
4. **Type Safety**: Maintains full TypeScript type checking

## Implementation Notes

1. Each service needs:
   - Static prisma property
   - resetPrisma method
   - All methods updated to use this.prisma

2. No changes needed to the service interfaces or DTOs

3. No changes needed to how services are used by routes

4. Changes are backward compatible - existing code will continue to work

## Migration Steps

1. Update each service class one at a time
2. Add resetPrisma calls to beforeEach blocks in tests
3. Update any direct prisma imports in tests to use service.prisma instead

## Testing Impact

These changes enable:
- Mocking database operations in unit tests
- Verifying correct database calls
- Testing error conditions
- Maintaining integration tests with real database