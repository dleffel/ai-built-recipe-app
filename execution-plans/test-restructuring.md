# Test Restructuring Plan

## Directory Structure
```
backend/src/
  tests/              
    unit/             # Unit tests with mocked dependencies
      routes/         # Route handler tests
        recipes.unit.test.ts
        auth.unit.test.ts
      services/       # Service layer tests
        recipeService.unit.test.ts
        userService.unit.test.ts
    integration/      # End-to-end tests with real DB
      recipes.integration.test.ts
      auth.integration.test.ts
    helpers/         # Shared test utilities
      mockPrisma.ts
      mockServices.ts
```

## Test Examples

### Unit Test - Service Layer (recipeService.unit.test.ts)
```typescript
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { RecipeService } from '../../services/recipeService';

// Mock Prisma
const mockPrisma = mockDeep<PrismaClient>();

describe('RecipeService Unit Tests', () => {
  describe('createRecipe', () => {
    it('should create recipe with valid data', async () => {
      // Setup mock return
      mockPrisma.recipe.create.mockResolvedValue({
        id: '123',
        title: 'Test Recipe',
        // ... other fields
      });

      const result = await RecipeService.createRecipe('user-1', {
        title: 'Test Recipe',
        // ... other fields
      });

      expect(result.title).toBe('Test Recipe');
      expect(mockPrisma.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Recipe',
          userId: 'user-1'
        })
      });
    });
  });
});
```

### Unit Test - Route Handler (recipes.unit.test.ts)
```typescript
import request from 'supertest';
import { RecipeService } from '../../services/recipeService';
import app from '../../server';

// Mock RecipeService
jest.mock('../../services/recipeService');

describe('Recipe Routes Unit Tests', () => {
  describe('POST /api/recipes', () => {
    it('should create recipe when authenticated', async () => {
      // Setup mock return
      const mockRecipe = {
        id: '123',
        title: 'Test Recipe'
      };
      RecipeService.createRecipe.mockResolvedValue(mockRecipe);

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', 'session=mock-session')
        .send({ title: 'Test Recipe' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
      expect(RecipeService.createRecipe).toHaveBeenCalled();
    });
  });
});
```

### Integration Test (recipes.integration.test.ts)
```typescript
import request from 'supertest';
import app from '../../server';
import { prisma } from '../../lib/prisma';
import { User } from '@prisma/client';

describe('Recipe API Integration Tests', () => {
  // Clear DB before each test
  beforeEach(async () => {
    await prisma.recipe.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/recipes', () => {
    it('should create and persist recipe', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/auth/dev-login')
        .send({ email: 'test@example.com' });

      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = cookies[0].split(';')[0];  // Get "session=value"
      const sessionSigCookie = cookies[1].split(';')[0];  // Get "session.sig=value"
      const authCookie = `${sessionCookie};${sessionSigCookie}`;
      const testUser: User = JSON.parse(loginResponse.text);

      // Create recipe
      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send({
          title: 'Test Recipe',
          ingredients: ['ingredient 1'],
          instructions: 'Test instructions'
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Test Recipe');

      // Verify persistence
      const saved = await prisma.recipe.findUnique({
        where: { id: response.body.id }
      });
      expect(saved).toBeDefined();
      expect(saved?.title).toBe('Test Recipe');
    });
  });
});
```

## Implementation Steps

1. Install Additional Dependencies
```bash
npm install --save-dev jest-mock-extended
```

2. Create Directory Structure
```bash
mkdir -p src/tests/{unit/{routes,services},integration,helpers}
```

3. Create Mock Helpers
- Create mockPrisma.ts for service layer tests
- Create mockServices.ts for route handler tests

4. Migrate Existing Tests
- Move current recipe tests to integration/
- Create new unit tests for services
- Create new unit tests for routes

5. Update Jest Configuration
- Configure test match patterns
- Set up different test environments

6. Clean Up
- Remove old __tests__ directory
- Update any import paths

## Required Service Changes

To support mocking in unit tests, we need:

1. Dependency Injection for Prisma
```typescript
export class RecipeService {
  static prisma = prisma; // Allow overriding in tests
  
  static async createRecipe(...) {
    return this.prisma.recipe.create(...);
  }
}
```

2. Static Methods to Support Mocking
- Keep current static methods
- Add ability to reset mocks between tests

## Success Criteria

1. All tests pass
2. Clear separation between unit and integration tests
3. Good test coverage (aim for 80%+)
4. Fast unit test execution
5. Reliable integration tests
