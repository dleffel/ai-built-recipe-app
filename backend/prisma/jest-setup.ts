import { prisma } from '../src/lib/prisma';
import 'jest';

// Clean up database before each test
beforeEach(async () => {
  await prisma.user.deleteMany();
});

// Disconnect Prisma after all tests are done
afterAll(async () => {
  await prisma.$disconnect();
});