import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { ContactService } from '../services/contactService';
import { TagService } from '../services/tagService';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    contact: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    contactVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    contactEmail: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    contactPhone: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    contactTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock TagService
jest.mock('../services/tagService', () => ({
  TagService: {
    findOrCreateTags: jest.fn(),
  },
}));

// Use any type for mocks to avoid TypeScript errors in tests
const mockPrismaContact = prisma.contact as any;
const mockPrismaContactVersion = prisma.contactVersion as any;
const mockPrismaTransaction = prisma.$transaction as any;
const mockTagService = TagService as any;

describe('ContactService Unit Tests', () => {
  const userId = 'test-user-id';
  const now = new Date();

  const mockContact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Inc',
    title: 'Engineer',
    notes: 'Test notes',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    birthday: new Date('1990-01-15'),
    userId,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    emails: [
      { id: 'email-1', email: 'john@example.com', label: 'work', isPrimary: true, contactId: 'contact-1' },
    ],
    phones: [
      { id: 'phone-1', phone: '555-1234', label: 'mobile', isPrimary: true, contactId: 'contact-1' },
    ],
    tags: [
      { id: 'ct-1', contactId: 'contact-1', tagId: 'tag-1', tag: { id: 'tag-1', name: 'Work', userId } },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ContactService.resetPrisma();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createContact', () => {
    it('should create a contact with all fields', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        title: 'Engineer',
        notes: 'Test notes',
        linkedInUrl: 'https://linkedin.com/in/johndoe',
        birthday: '1990-01-15',
        emails: [{ email: 'john@example.com', label: 'work', isPrimary: true }],
        phones: [{ phone: '555-1234', label: 'mobile', isPrimary: true }],
        tags: ['Work'],
      };

      mockTagService.findOrCreateTags.mockResolvedValue([{ id: 'tag-1', name: 'Work', userId }]);
      mockPrismaContact.create.mockResolvedValue(mockContact);
      mockPrismaContactVersion.create.mockResolvedValue({});

      const result = await ContactService.createContact(userId, createData);

      expect(mockTagService.findOrCreateTags).toHaveBeenCalledWith(userId, ['Work']);
      expect(mockPrismaContact.create).toHaveBeenCalled();
      expect(mockPrismaContactVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'contact-1',
            version: 1,
          }),
        })
      );
      expect(result).toEqual(mockContact);
    });

    it('should create a contact without optional fields', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const minimalContact = {
        ...mockContact,
        company: null,
        title: null,
        notes: null,
        linkedInUrl: null,
        birthday: null,
        emails: [],
        phones: [],
        tags: [],
      };

      mockPrismaContact.create.mockResolvedValue(minimalContact);
      mockPrismaContactVersion.create.mockResolvedValue({});

      const result = await ContactService.createContact(userId, createData);

      expect(mockTagService.findOrCreateTags).not.toHaveBeenCalled();
      expect(result).toEqual(minimalContact);
    });

    it('should set first email as primary by default', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
        emails: [
          { email: 'john@example.com', label: 'work' },
          { email: 'john2@example.com', label: 'personal' },
        ],
      };

      mockPrismaContact.create.mockResolvedValue(mockContact);
      mockPrismaContactVersion.create.mockResolvedValue({});

      await ContactService.createContact(userId, createData);

      expect(mockPrismaContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emails: {
              create: expect.arrayContaining([
                expect.objectContaining({ email: 'john@example.com', isPrimary: true }),
                expect.objectContaining({ email: 'john2@example.com', isPrimary: false }),
              ]),
            },
          }),
        })
      );
    });
  });

  describe('findById', () => {
    it('should find a contact by ID', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(mockContact);

      const result = await ContactService.findById('contact-1');

      expect(mockPrismaContact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockContact);
    });

    it('should return null if contact not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(null);

      const result = await ContactService.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getContactsByUserId', () => {
    it('should get contacts with default pagination', async () => {
      mockPrismaContact.count.mockResolvedValue(1);
      mockPrismaContact.findMany.mockResolvedValue([mockContact]);

      const result = await ContactService.getContactsByUserId(userId);

      expect(mockPrismaContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, isDeleted: false },
          skip: 0,
          take: 20,
          orderBy: { lastName: 'asc' },
        })
      );
      expect(result.contacts).toHaveLength(1);
      expect(result.pagination).toEqual({ total: 1, skip: 0, take: 20 });
    });

    it('should apply search filter', async () => {
      mockPrismaContact.count.mockResolvedValue(1);
      mockPrismaContact.findMany.mockResolvedValue([mockContact]);

      await ContactService.getContactsByUserId(userId, { search: 'John' });

      expect(mockPrismaContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should apply custom pagination', async () => {
      mockPrismaContact.count.mockResolvedValue(100);
      mockPrismaContact.findMany.mockResolvedValue([mockContact]);

      const result = await ContactService.getContactsByUserId(userId, { skip: 20, take: 10 });

      expect(mockPrismaContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({ total: 100, skip: 20, take: 10 });
    });

    it('should apply custom sorting', async () => {
      mockPrismaContact.count.mockResolvedValue(1);
      mockPrismaContact.findMany.mockResolvedValue([mockContact]);

      await ContactService.getContactsByUserId(userId, { sortBy: 'firstName', sortOrder: 'desc' });

      expect(mockPrismaContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { firstName: 'desc' },
        })
      );
    });
  });

  describe('updateContact', () => {
    it('should update a contact and create a new version', async () => {
      const updateData = { firstName: 'Johnny' };
      const updatedContact = { ...mockContact, firstName: 'Johnny' };

      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const mockFn = () => jest.fn() as any;
        const tx = {
          contactEmail: { deleteMany: mockFn(), createMany: mockFn() },
          contactPhone: { deleteMany: mockFn(), createMany: mockFn() },
          contactTag: { deleteMany: mockFn(), createMany: mockFn() },
          contact: { update: mockFn().mockResolvedValue(updatedContact) },
          contactVersion: { findFirst: mockFn().mockResolvedValue({ version: 1 }), create: mockFn() },
        };
        return callback(tx);
      });

      const result = await ContactService.updateContact('contact-1', userId, updateData);

      expect(result.firstName).toBe('Johnny');
    });

    it('should throw error if contact not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(null);

      await expect(ContactService.updateContact('non-existent', userId, { firstName: 'Test' }))
        .rejects.toThrow('Contact not found or unauthorized');
    });

    it('should throw error if user is not authorized', async () => {
      mockPrismaContact.findUnique.mockResolvedValue({ ...mockContact, userId: 'other-user' });

      await expect(ContactService.updateContact('contact-1', userId, { firstName: 'Test' }))
        .rejects.toThrow('Contact not found or unauthorized');
    });

    it('should throw error if contact is deleted', async () => {
      mockPrismaContact.findUnique.mockResolvedValue({ ...mockContact, isDeleted: true });

      await expect(ContactService.updateContact('contact-1', userId, { firstName: 'Test' }))
        .rejects.toThrow('Cannot update a deleted contact');
    });

    it('should update tags when provided', async () => {
      const updateData = { tags: ['Personal', 'Family'] };

      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockTagService.findOrCreateTags.mockResolvedValue([
        { id: 'tag-2', name: 'Personal', userId },
        { id: 'tag-3', name: 'Family', userId },
      ]);

      const mockFn = () => jest.fn() as any;
      const mockTx = {
        contactEmail: { deleteMany: mockFn(), createMany: mockFn() },
        contactPhone: { deleteMany: mockFn(), createMany: mockFn() },
        contactTag: { deleteMany: mockFn(), createMany: mockFn() },
        contact: { update: mockFn().mockResolvedValue(mockContact) },
        contactVersion: { findFirst: mockFn().mockResolvedValue({ version: 1 }), create: mockFn() },
      };
      mockPrismaTransaction.mockImplementation(async (callback: any) => callback(mockTx));

      await ContactService.updateContact('contact-1', userId, updateData);

      expect(mockTagService.findOrCreateTags).toHaveBeenCalledWith(userId, ['Personal', 'Family']);
      expect(mockTx.contactTag.deleteMany).toHaveBeenCalled();
      expect(mockTx.contactTag.createMany).toHaveBeenCalled();
    });
  });

  describe('deleteContact', () => {
    it('should soft delete a contact', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaContact.update.mockResolvedValue({ ...mockContact, isDeleted: true });

      const result = await ContactService.deleteContact('contact-1', userId);

      expect(mockPrismaContact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: { isDeleted: true },
      });
      expect(result.isDeleted).toBe(true);
    });

    it('should throw error if contact not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(null);

      await expect(ContactService.deleteContact('non-existent', userId))
        .rejects.toThrow('Contact not found or unauthorized');
    });

    it('should throw error if user is not authorized', async () => {
      mockPrismaContact.findUnique.mockResolvedValue({ ...mockContact, userId: 'other-user' });

      await expect(ContactService.deleteContact('contact-1', userId))
        .rejects.toThrow('Contact not found or unauthorized');
    });
  });

  describe('getVersions', () => {
    it('should get version history for a contact', async () => {
      const versions = [
        { id: 'v-2', contactId: 'contact-1', version: 2, snapshot: {}, changes: {}, createdAt: now },
        { id: 'v-1', contactId: 'contact-1', version: 1, snapshot: {}, changes: {}, createdAt: now },
      ];

      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaContactVersion.findMany.mockResolvedValue(versions);

      const result = await ContactService.getVersions('contact-1', userId);

      expect(mockPrismaContactVersion.findMany).toHaveBeenCalledWith({
        where: { contactId: 'contact-1' },
        orderBy: { version: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should throw error if contact not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(null);

      await expect(ContactService.getVersions('non-existent', userId))
        .rejects.toThrow('Contact not found or unauthorized');
    });
  });

  describe('getVersion', () => {
    it('should get a specific version of a contact', async () => {
      const version = { id: 'v-1', contactId: 'contact-1', version: 1, snapshot: {}, changes: {}, createdAt: now };

      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaContactVersion.findFirst.mockResolvedValue(version);

      const result = await ContactService.getVersion('contact-1', 1, userId);

      expect(mockPrismaContactVersion.findFirst).toHaveBeenCalledWith({
        where: { contactId: 'contact-1', version: 1 },
      });
      expect(result).toEqual(version);
    });

    it('should throw error if contact not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(null);

      await expect(ContactService.getVersion('non-existent', 1, userId))
        .rejects.toThrow('Contact not found or unauthorized');
    });
  });

  describe('restoreVersion', () => {
    it('should restore a contact to a specific version', async () => {
      const snapshot = {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Old Company',
        title: null,
        notes: null,
        linkedInUrl: null,
        birthday: null,
        emails: [],
        phones: [],
        tags: [],
      };
      const version = { id: 'v-1', contactId: 'contact-1', version: 1, snapshot, changes: {}, createdAt: now };

      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaContactVersion.findFirst.mockResolvedValue(version);

      // Mock the updateContact transaction
      const restoredContact = { ...mockContact, company: 'Old Company' };
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const mockFn = () => jest.fn() as any;
        const tx = {
          contactEmail: { deleteMany: mockFn(), createMany: mockFn() },
          contactPhone: { deleteMany: mockFn(), createMany: mockFn() },
          contactTag: { deleteMany: mockFn(), createMany: mockFn() },
          contact: { update: mockFn().mockResolvedValue(restoredContact) },
          contactVersion: { findFirst: mockFn().mockResolvedValue({ version: 2 }), create: mockFn() },
        };
        return callback(tx);
      });

      const result = await ContactService.restoreVersion('contact-1', userId, 1);

      expect(result.company).toBe('Old Company');
    });

    it('should throw error if version not found', async () => {
      mockPrismaContact.findUnique.mockResolvedValue(mockContact);
      mockPrismaContactVersion.findFirst.mockResolvedValue(null);

      await expect(ContactService.restoreVersion('contact-1', userId, 999))
        .rejects.toThrow('Version not found');
    });
  });

  describe('searchContacts', () => {
    it('should search contacts by query', async () => {
      mockPrismaContact.count.mockResolvedValue(1);
      mockPrismaContact.findMany.mockResolvedValue([mockContact]);

      const result = await ContactService.searchContacts(userId, 'John');

      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmailAddress', () => {
    it('should find a contact by email address', async () => {
      mockPrismaContact.findFirst.mockResolvedValue(mockContact);

      const result = await ContactService.findByEmailAddress(userId, 'john@example.com');

      expect(mockPrismaContact.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          isDeleted: false,
          emails: {
            some: {
              email: {
                equals: 'john@example.com',
                mode: 'insensitive',
              },
            },
          },
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockContact);
    });

    it('should return null if no contact found with email', async () => {
      mockPrismaContact.findFirst.mockResolvedValue(null);

      const result = await ContactService.findByEmailAddress(userId, 'unknown@example.com');

      expect(result).toBeNull();
    });
  });
});
