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