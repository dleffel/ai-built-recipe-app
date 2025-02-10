# Database Setup Steps

## 1. Required Package Installation

```bash
# Install Prisma dependencies
npm install @prisma/client
npm install prisma --save-dev
```

## 2. Environment Variables to Add

Add these variables to `backend/.env`:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/recipe_app_dev?schema=public"
TEST_DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/recipe_app_test?schema=public"
```

## 3. PostgreSQL Setup

1. Install PostgreSQL if not already installed:
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. Create development and test databases:
   ```bash
   psql postgres
   CREATE DATABASE recipe_app_dev;
   CREATE DATABASE recipe_app_test;
   ```

## 4. Prisma Configuration

1. Initialize Prisma:
   ```bash
   npx prisma init
   ```

2. Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  googleId    String?   @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastLoginAt DateTime?

  @@map("users")
}
```

## 5. Update Scripts in package.json

Add these scripts to `backend/package.json`:

```json
{
  "scripts": {
    "prisma:studio": "prisma studio",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:reset": "prisma migrate reset",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:migrate:status": "prisma migrate status",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

## 6. Create Database Client

Create `backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

## 7. Create User Service

Create `backend/src/services/userService.ts`:

```typescript
import { prisma } from '../lib/prisma';
import type { User } from '@prisma/client';

export class UserService {
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleId }
    });
  }

  static async createUser(data: {
    email: string;
    googleId?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        lastLoginAt: new Date()
      }
    });
  }

  static async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    });
  }
}
```

## 8. Setup Test Environment

Create `backend/prisma/jest-setup.ts`:

```typescript
import { prisma } from '../src/lib/prisma';

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

Update `backend/jest.config.js`:

```javascript
module.exports = {
  // ... other config
  setupFilesAfterEnv: [
    '<rootDir>/prisma/jest-setup.ts'
  ],
};
```

## Next Steps After Setup

1. Generate initial migration:
   ```bash
   npm run prisma:migrate:dev -- --name init
   ```

2. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

3. Update authentication system to use UserService

4. Add database integration tests

## Important Notes

- Never commit database credentials to version control
- Keep migrations in version control
- Use environment variables for all sensitive configuration
- Always backup database before running migrations in production
- Test migrations in development/test environment first
- Use Prisma Studio for data visualization during development:
  ```bash
  npm run prisma:studio
  ```

## Troubleshooting

1. If Prisma Client generation fails:
   ```bash
   rm -rf node_modules
   npm install
   npm run prisma:generate
   ```

2. If migrations need to be reset:
   ```bash
   npm run prisma:migrate:reset
   ```

3. To view current migration status:
   ```bash
   npm run prisma:migrate:status