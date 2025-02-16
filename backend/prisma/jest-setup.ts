import { prisma } from '../src/lib/prisma';
import 'jest';

// Clean up database before each test
beforeEach(async () => {
  // Delete recipes first to handle foreign key constraints
  //await prisma.recipe.deleteMany();
  // Then delete users
  //await prisma.user.deleteMany();
});

// Clean up database and disconnect after all tests
afterAll(async () => {
  // Clean up in correct order
  // await prisma.$transaction(async (tx) => {
  //   await tx.recipe.deleteMany();
  //   await tx.user.deleteMany();
  // });

  //await prisma.$disconnect();

});