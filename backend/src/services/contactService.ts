import type { Contact, ContactEmail, ContactPhone, ContactVersion, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import {
  CreateContactDTO,
  UpdateContactDTO,
  ContactListParams,
  ContactSnapshot,
  ContactChanges,
  ContactEmailDTO,
  ContactPhoneDTO,
} from '../types/contact';

// Contact with relations type
export type ContactWithRelations = Contact & {
  emails: ContactEmail[];
  phones: ContactPhone[];
};

// Contact list response type
export interface ContactListResponse {
  contacts: ContactWithRelations[];
  pagination: {
    total: number;
    skip: number;
    take: number;
  };
}

export class ContactService extends BaseService {
  /**
   * Create a new contact with emails and phones
   */
  static async createContact(userId: string, data: CreateContactDTO): Promise<ContactWithRelations> {
    const contact = await this.prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        title: data.title,
        notes: data.notes,
        linkedInUrl: data.linkedInUrl,
        userId,
        emails: data.emails && data.emails.length > 0 ? {
          create: data.emails.map((e, index) => ({
            email: e.email,
            label: e.label,
            isPrimary: e.isPrimary ?? index === 0, // First email is primary by default
          })),
        } : undefined,
        phones: data.phones && data.phones.length > 0 ? {
          create: data.phones.map((p, index) => ({
            phone: p.phone,
            label: p.label,
            isPrimary: p.isPrimary ?? index === 0, // First phone is primary by default
          })),
        } : undefined,
      },
      include: {
        emails: true,
        phones: true,
      },
    });

    // Create initial version (version 1)
    const snapshot = this.createSnapshot(contact);
    await this.prisma.contactVersion.create({
      data: {
        contactId: contact.id,
        version: 1,
        snapshot: snapshot as unknown as Prisma.JsonObject,
        changes: {} as Prisma.JsonObject, // No changes for initial version
      },
    });

    return contact;
  }

  /**
   * Find a contact by ID
   */
  static async findById(id: string): Promise<ContactWithRelations | null> {
    return this.prisma.contact.findUnique({
      where: { id },
      include: {
        emails: true,
        phones: true,
      },
    });
  }

  /**
   * Get contacts for a user with pagination and search
   */
  static async getContactsByUserId(
    userId: string,
    params: ContactListParams = {}
  ): Promise<ContactListResponse> {
    const {
      skip = 0,
      take = 20,
      search,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = params;

    const whereClause: Prisma.ContactWhereInput = {
      userId,
      isDeleted: false,
    };

    // Add search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      whereClause.OR = [
        { firstName: { contains: searchLower, mode: 'insensitive' } },
        { lastName: { contains: searchLower, mode: 'insensitive' } },
        { company: { contains: searchLower, mode: 'insensitive' } },
        { title: { contains: searchLower, mode: 'insensitive' } },
        { notes: { contains: searchLower, mode: 'insensitive' } },
        { emails: { some: { email: { contains: searchLower, mode: 'insensitive' } } } },
        { phones: { some: { phone: { contains: search } } } },
      ];
    }

    // Get total count
    const total = await this.prisma.contact.count({ where: whereClause });

    // Get contacts with pagination
    const contacts = await this.prisma.contact.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        emails: true,
        phones: true,
      },
    });

    return {
      contacts,
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Update a contact (creates a new version)
   */
  static async updateContact(
    id: string,
    userId: string,
    data: UpdateContactDTO
  ): Promise<ContactWithRelations> {
    // First verify ownership and get current state
    const existingContact = await this.findById(id);
    if (!existingContact || existingContact.userId !== userId) {
      throw new Error('Contact not found or unauthorized');
    }

    if (existingContact.isDeleted) {
      throw new Error('Cannot update a deleted contact');
    }

    // Create snapshot of current state before update
    const previousSnapshot = this.createSnapshot(existingContact);

    // Build update data
    const updateData: Prisma.ContactUpdateInput = {};
    
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.linkedInUrl !== undefined) updateData.linkedInUrl = data.linkedInUrl;

    // Wrap all database operations in a transaction to ensure atomicity
    const updatedContact = await this.prisma.$transaction(async (tx) => {
      // Handle emails update - delete all and recreate
      if (data.emails !== undefined) {
        await tx.contactEmail.deleteMany({ where: { contactId: id } });
        if (data.emails.length > 0) {
          await tx.contactEmail.createMany({
            data: data.emails.map((e, index) => ({
              contactId: id,
              email: e.email,
              label: e.label,
              isPrimary: e.isPrimary ?? index === 0,
            })),
          });
        }
      }

      // Handle phones update - delete all and recreate
      if (data.phones !== undefined) {
        await tx.contactPhone.deleteMany({ where: { contactId: id } });
        if (data.phones.length > 0) {
          await tx.contactPhone.createMany({
            data: data.phones.map((p, index) => ({
              contactId: id,
              phone: p.phone,
              label: p.label,
              isPrimary: p.isPrimary ?? index === 0,
            })),
          });
        }
      }

      // Update the contact
      const contact = await tx.contact.update({
        where: { id },
        data: updateData,
        include: {
          emails: true,
          phones: true,
        },
      });

      // Create new version
      const newSnapshot = this.createSnapshot(contact);
      const changes = this.computeChanges(previousSnapshot, newSnapshot);

      // Get the latest version number
      const latestVersion = await tx.contactVersion.findFirst({
        where: { contactId: id },
        orderBy: { version: 'desc' },
      });

      const newVersionNumber = (latestVersion?.version ?? 0) + 1;

      await tx.contactVersion.create({
        data: {
          contactId: id,
          version: newVersionNumber,
          snapshot: newSnapshot as unknown as Prisma.JsonObject,
          changes: changes as unknown as Prisma.JsonObject,
        },
      });

      return contact;
    });

    return updatedContact;
  }

  /**
   * Soft delete a contact
   */
  static async deleteContact(id: string, userId: string): Promise<Contact> {
    // First verify ownership
    const contact = await this.findById(id);
    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found or unauthorized');
    }

    return this.prisma.contact.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Get version history for a contact
   */
  static async getVersions(contactId: string, userId: string): Promise<ContactVersion[]> {
    // Verify ownership
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found or unauthorized');
    }

    return this.prisma.contactVersion.findMany({
      where: { contactId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get a specific version of a contact
   */
  static async getVersion(
    contactId: string,
    version: number,
    userId: string
  ): Promise<ContactVersion | null> {
    // Verify ownership
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found or unauthorized');
    }

    return this.prisma.contactVersion.findFirst({
      where: { contactId, version },
    });
  }

  /**
   * Restore a contact to a specific version
   */
  static async restoreVersion(
    id: string,
    userId: string,
    version: number
  ): Promise<ContactWithRelations> {
    // Get the version to restore
    const versionRecord = await this.getVersion(id, version, userId);
    if (!versionRecord) {
      throw new Error('Version not found');
    }

    const snapshot = versionRecord.snapshot as unknown as ContactSnapshot;

    // Update the contact with the snapshot data
    return this.updateContact(id, userId, {
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      company: snapshot.company,
      title: snapshot.title,
      notes: snapshot.notes,
      linkedInUrl: snapshot.linkedInUrl,
      emails: snapshot.emails,
      phones: snapshot.phones,
    });
  }

  /**
   * Search contacts by query string
   */
  static async searchContacts(
    userId: string,
    query: string
  ): Promise<ContactWithRelations[]> {
    const result = await this.getContactsByUserId(userId, {
      search: query,
      take: 50,
    });
    return result.contacts;
  }

  /**
   * Find a contact by email address
   * Used by the email analysis agent to match incoming emails to contacts
   */
  static async findByEmailAddress(
    userId: string,
    emailAddress: string
  ): Promise<ContactWithRelations | null> {
    return this.prisma.contact.findFirst({
      where: {
        userId,
        isDeleted: false,
        emails: {
          some: {
            email: {
              equals: emailAddress,
              mode: 'insensitive',
            },
          },
        },
      },
      include: {
        emails: true,
        phones: true,
      },
    });
  }

  /**
   * Create a snapshot of the current contact state
   */
  private static createSnapshot(contact: ContactWithRelations): ContactSnapshot {
    return {
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      title: contact.title,
      notes: contact.notes,
      linkedInUrl: contact.linkedInUrl,
      emails: contact.emails.map(e => ({
        email: e.email,
        label: e.label,
        isPrimary: e.isPrimary,
      })),
      phones: contact.phones.map(p => ({
        phone: p.phone,
        label: p.label,
        isPrimary: p.isPrimary,
      })),
    };
  }

  /**
   * Compute the changes between two snapshots
   */
  private static computeChanges(
    previous: ContactSnapshot,
    current: ContactSnapshot
  ): ContactChanges {
    const changes: ContactChanges = {};

    // Compare simple fields
    const simpleFields: (keyof ContactSnapshot)[] = [
      'firstName',
      'lastName',
      'company',
      'title',
      'notes',
      'linkedInUrl',
    ];

    for (const field of simpleFields) {
      if (previous[field] !== current[field]) {
        changes[field] = {
          from: previous[field],
          to: current[field],
        };
      }
    }

    // Compare emails
    const prevEmails = JSON.stringify(previous.emails);
    const currEmails = JSON.stringify(current.emails);
    if (prevEmails !== currEmails) {
      changes.emails = {
        from: previous.emails,
        to: current.emails,
      };
    }

    // Compare phones
    const prevPhones = JSON.stringify(previous.phones);
    const currPhones = JSON.stringify(current.phones);
    if (prevPhones !== currPhones) {
      changes.phones = {
        from: previous.phones,
        to: current.phones,
      };
    }

    return changes;
  }
}
