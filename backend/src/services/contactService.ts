import type { Contact, ContactEmail, ContactPhone, ContactVersion, Tag, ContactTag, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import { TagService } from './tagService';
import {
  CreateContactDTO,
  UpdateContactDTO,
  ContactListParams,
  ContactSnapshot,
  ContactChanges,
  MergeContactsDTO,
  MergeContactsResult,
} from '../types/contact';

// Tag with basic info
export type TagInfo = {
  id: string;
  name: string;
};

// Contact with relations type
export type ContactWithRelations = Contact & {
  emails: ContactEmail[];
  phones: ContactPhone[];
  tags: (ContactTag & { tag: Tag })[];
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

// Standard include for contact queries
const contactInclude = {
  emails: true,
  phones: true,
  tags: {
    include: {
      tag: true,
    },
  },
} as const;

export class ContactService extends BaseService {
  /**
   * Create a new contact with emails, phones, and tags
   */
  static async createContact(userId: string, data: CreateContactDTO): Promise<ContactWithRelations> {
    // First, find or create tags if provided
    let tagIds: string[] = [];
    if (data.tags && data.tags.length > 0) {
      const tags = await TagService.findOrCreateTags(userId, data.tags);
      tagIds = tags.map(t => t.id);
    }

    const contact = await this.prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        title: data.title,
        notes: data.notes,
        linkedInUrl: data.linkedInUrl,
        birthday: data.birthday ? new Date(data.birthday) : null,
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
        tags: tagIds.length > 0 ? {
          create: tagIds.map(tagId => ({ tagId })),
        } : undefined,
      },
      include: contactInclude,
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
      include: contactInclude,
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
        { tags: { some: { tag: { name: { contains: searchLower, mode: 'insensitive' } } } } },
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
      include: contactInclude,
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
    if (data.birthday !== undefined) updateData.birthday = data.birthday ? new Date(data.birthday) : null;

    // Find or create tags if provided
    let tagIds: string[] | undefined;
    if (data.tags !== undefined) {
      if (data.tags.length > 0) {
        const tags = await TagService.findOrCreateTags(userId, data.tags);
        tagIds = tags.map(t => t.id);
      } else {
        tagIds = [];
      }
    }

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

      // Handle tags update - delete all and recreate
      if (tagIds !== undefined) {
        await tx.contactTag.deleteMany({ where: { contactId: id } });
        if (tagIds.length > 0) {
          await tx.contactTag.createMany({
            data: tagIds.map(tagId => ({
              contactId: id,
              tagId,
            })),
          });
        }
      }

      // Update the contact
      const contact = await tx.contact.update({
        where: { id },
        data: updateData,
        include: contactInclude,
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
      birthday: snapshot.birthday,
      emails: snapshot.emails,
      phones: snapshot.phones,
      tags: snapshot.tags,
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
      include: contactInclude,
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
      birthday: contact.birthday ? contact.birthday.toISOString() : null,
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
      tags: contact.tags.map(ct => ct.tag.name),
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
    const simpleFields: (keyof Omit<ContactSnapshot, 'emails' | 'phones' | 'tags'>)[] = [
      'firstName',
      'lastName',
      'company',
      'title',
      'notes',
      'linkedInUrl',
      'birthday',
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

    // Compare tags
    const prevTags = JSON.stringify([...previous.tags].sort());
    const currTags = JSON.stringify([...current.tags].sort());
    if (prevTags !== currTags) {
      changes.tags = {
        from: previous.tags,
        to: current.tags,
      };
    }

    return changes;
  }

  /**
   * Merge two contacts into one
   * The primary contact is kept and updated with merged data
   * The secondary contact is soft-deleted
   */
  static async mergeContacts(
    userId: string,
    data: MergeContactsDTO
  ): Promise<MergeContactsResult> {
    const { primaryContactId, secondaryContactId, fieldResolution = {}, mergeEmails = true, mergePhones = true, mergeTags = true } = data;

    // Validate that both contacts exist and belong to the user
    const [primaryContact, secondaryContact] = await Promise.all([
      this.findById(primaryContactId),
      this.findById(secondaryContactId),
    ]);

    if (!primaryContact || primaryContact.userId !== userId) {
      throw new Error('Primary contact not found or unauthorized');
    }

    if (!secondaryContact || secondaryContact.userId !== userId) {
      throw new Error('Secondary contact not found or unauthorized');
    }

    if (primaryContact.isDeleted) {
      throw new Error('Cannot merge into a deleted contact');
    }

    if (secondaryContact.isDeleted) {
      throw new Error('Cannot merge a deleted contact');
    }

    if (primaryContactId === secondaryContactId) {
      throw new Error('Cannot merge a contact with itself');
    }

    // Track which fields came from which contact
    const fieldsFromPrimary: string[] = [];
    const fieldsFromSecondary: string[] = [];

    // Helper to resolve field value
    const resolveField = <T>(
      fieldName: string,
      primaryValue: T | null,
      secondaryValue: T | null,
      resolution?: 'primary' | 'secondary'
    ): T | null => {
      if (resolution === 'secondary') {
        if (secondaryValue !== null && secondaryValue !== undefined && secondaryValue !== '') {
          fieldsFromSecondary.push(fieldName);
          return secondaryValue;
        }
        fieldsFromPrimary.push(fieldName);
        return primaryValue;
      }
      // Default: use primary if available, otherwise secondary
      if (primaryValue !== null && primaryValue !== undefined && primaryValue !== '') {
        fieldsFromPrimary.push(fieldName);
        return primaryValue;
      }
      if (secondaryValue !== null && secondaryValue !== undefined && secondaryValue !== '') {
        fieldsFromSecondary.push(fieldName);
        return secondaryValue;
      }
      fieldsFromPrimary.push(fieldName);
      return primaryValue;
    };

    // Resolve each field
    const mergedFirstName = resolveField('firstName', primaryContact.firstName, secondaryContact.firstName, fieldResolution.firstName) || primaryContact.firstName;
    const mergedLastName = resolveField('lastName', primaryContact.lastName, secondaryContact.lastName, fieldResolution.lastName) || primaryContact.lastName;
    const mergedCompany = resolveField('company', primaryContact.company, secondaryContact.company, fieldResolution.company);
    const mergedTitle = resolveField('title', primaryContact.title, secondaryContact.title, fieldResolution.title);
    const mergedLinkedInUrl = resolveField('linkedInUrl', primaryContact.linkedInUrl, secondaryContact.linkedInUrl, fieldResolution.linkedInUrl);
    const mergedBirthday = resolveField('birthday', primaryContact.birthday, secondaryContact.birthday, fieldResolution.birthday);

    // Handle notes specially - can be merged
    let mergedNotes: string | null;
    if (fieldResolution.notes === 'merge') {
      const notes: string[] = [];
      if (primaryContact.notes) notes.push(primaryContact.notes);
      if (secondaryContact.notes) notes.push(secondaryContact.notes);
      mergedNotes = notes.length > 0 ? notes.join('\n\n---\n\n') : null;
      if (primaryContact.notes) fieldsFromPrimary.push('notes');
      if (secondaryContact.notes) fieldsFromSecondary.push('notes');
    } else {
      mergedNotes = resolveField('notes', primaryContact.notes, secondaryContact.notes, fieldResolution.notes);
    }

    // Merge emails - combine unique emails from both contacts
    let emailsMerged = 0;
    const mergedEmails: Array<{ email: string; label: string; isPrimary: boolean }> = [];
    const seenEmails = new Set<string>();

    // Add primary contact's emails first
    for (const email of primaryContact.emails) {
      const normalizedEmail = email.email.toLowerCase();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        mergedEmails.push({
          email: email.email,
          label: email.label,
          isPrimary: email.isPrimary,
        });
      }
    }

    // Add secondary contact's emails if merging
    if (mergeEmails) {
      for (const email of secondaryContact.emails) {
        const normalizedEmail = email.email.toLowerCase();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          mergedEmails.push({
            email: email.email,
            label: email.label,
            isPrimary: false, // Secondary emails are not primary
          });
          emailsMerged++;
        }
      }
    }

    // Merge phones - combine unique phones from both contacts
    let phonesMerged = 0;
    const mergedPhones: Array<{ phone: string; label: string; isPrimary: boolean }> = [];
    const seenPhones = new Set<string>();

    // Normalize phone for comparison
    const normalizePhone = (phone: string): string => phone.replace(/\D/g, '').slice(-10);

    // Add primary contact's phones first
    for (const phone of primaryContact.phones) {
      const normalizedPhone = normalizePhone(phone.phone);
      if (!seenPhones.has(normalizedPhone)) {
        seenPhones.add(normalizedPhone);
        mergedPhones.push({
          phone: phone.phone,
          label: phone.label,
          isPrimary: phone.isPrimary,
        });
      }
    }

    // Add secondary contact's phones if merging
    if (mergePhones) {
      for (const phone of secondaryContact.phones) {
        const normalizedPhone = normalizePhone(phone.phone);
        if (!seenPhones.has(normalizedPhone)) {
          seenPhones.add(normalizedPhone);
          mergedPhones.push({
            phone: phone.phone,
            label: phone.label,
            isPrimary: false, // Secondary phones are not primary
          });
          phonesMerged++;
        }
      }
    }

    // Merge tags - combine unique tags from both contacts
    let tagsMerged = 0;
    const primaryTagNames = primaryContact.tags.map(ct => ct.tag.name);
    const secondaryTagNames = secondaryContact.tags.map(ct => ct.tag.name);
    const mergedTagNames = [...new Set([...primaryTagNames, ...(mergeTags ? secondaryTagNames : [])])];
    tagsMerged = mergedTagNames.filter(t => !primaryTagNames.includes(t)).length;

    // Wrap both update and delete in a transaction to ensure atomicity
    // If either operation fails, both will be rolled back
    const updatedContact = await this.prisma.$transaction(async (tx) => {
      // Get current state of primary contact for versioning
      const existingContact = await tx.contact.findUnique({
        where: { id: primaryContactId },
        include: contactInclude,
      });

      if (!existingContact) {
        throw new Error('Primary contact not found');
      }

      // Create snapshot of current state before update
      const previousSnapshot = this.createSnapshot(existingContact as ContactWithRelations);

      // Find or create tags if needed
      let tagIds: string[] = [];
      if (mergedTagNames.length > 0) {
        const tags = await TagService.findOrCreateTags(userId, mergedTagNames);
        tagIds = tags.map(t => t.id);
      }

      // Handle emails update - delete all and recreate
      await tx.contactEmail.deleteMany({ where: { contactId: primaryContactId } });
      if (mergedEmails.length > 0) {
        await tx.contactEmail.createMany({
          data: mergedEmails.map((e, index) => ({
            contactId: primaryContactId,
            email: e.email,
            label: e.label,
            isPrimary: e.isPrimary ?? index === 0,
          })),
        });
      }

      // Handle phones update - delete all and recreate
      await tx.contactPhone.deleteMany({ where: { contactId: primaryContactId } });
      if (mergedPhones.length > 0) {
        await tx.contactPhone.createMany({
          data: mergedPhones.map((p, index) => ({
            contactId: primaryContactId,
            phone: p.phone,
            label: p.label,
            isPrimary: p.isPrimary ?? index === 0,
          })),
        });
      }

      // Handle tags update - delete all and recreate
      await tx.contactTag.deleteMany({ where: { contactId: primaryContactId } });
      if (tagIds.length > 0) {
        await tx.contactTag.createMany({
          data: tagIds.map(tagId => ({
            contactId: primaryContactId,
            tagId,
          })),
        });
      }

      // Update the primary contact
      const contact = await tx.contact.update({
        where: { id: primaryContactId },
        data: {
          firstName: mergedFirstName,
          lastName: mergedLastName,
          company: mergedCompany,
          title: mergedTitle,
          notes: mergedNotes,
          linkedInUrl: mergedLinkedInUrl,
          birthday: mergedBirthday ? mergedBirthday : null,
        },
        include: contactInclude,
      });

      // Create new version for the update
      const newSnapshot = this.createSnapshot(contact);
      const changes = this.computeChanges(previousSnapshot, newSnapshot);

      // Get the latest version number
      const latestVersion = await tx.contactVersion.findFirst({
        where: { contactId: primaryContactId },
        orderBy: { version: 'desc' },
      });

      const newVersionNumber = (latestVersion?.version ?? 0) + 1;

      await tx.contactVersion.create({
        data: {
          contactId: primaryContactId,
          version: newVersionNumber,
          snapshot: newSnapshot as unknown as Prisma.JsonObject,
          changes: changes as unknown as Prisma.JsonObject,
        },
      });

      // Soft delete the secondary contact within the same transaction
      await tx.contact.update({
        where: { id: secondaryContactId },
        data: { isDeleted: true },
      });

      return contact;
    });

    return {
      mergedContact: {
        id: updatedContact.id,
        firstName: updatedContact.firstName,
        lastName: updatedContact.lastName,
      },
      deletedContactId: secondaryContactId,
      fieldsFromPrimary,
      fieldsFromSecondary,
      emailsMerged,
      phonesMerged,
      tagsMerged,
    };
  }

  /**
   * Find potential duplicate contacts for a given contact
   * Returns contacts that might be duplicates based on name or email similarity
   */
  static async findPotentialDuplicates(
    contactId: string,
    userId: string
  ): Promise<ContactWithRelations[]> {
    const contact = await this.findById(contactId);
    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found or unauthorized');
    }

    const duplicates: ContactWithRelations[] = [];
    const seenIds = new Set<string>([contactId]);

    // Find contacts with matching emails
    for (const email of contact.emails) {
      const match = await this.findByEmailAddress(userId, email.email);
      if (match && !seenIds.has(match.id) && !match.isDeleted) {
        duplicates.push(match);
        seenIds.add(match.id);
      }
    }

    // Find contacts with similar names
    const nameMatches = await this.prisma.contact.findMany({
      where: {
        userId,
        isDeleted: false,
        id: { notIn: Array.from(seenIds) },
        OR: [
          // Exact name match (case insensitive)
          {
            firstName: { equals: contact.firstName, mode: 'insensitive' },
            lastName: { equals: contact.lastName, mode: 'insensitive' },
          },
          // First name matches last name and vice versa (swapped names)
          {
            firstName: { equals: contact.lastName, mode: 'insensitive' },
            lastName: { equals: contact.firstName, mode: 'insensitive' },
          },
        ],
      },
      include: {
        emails: true,
        phones: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    for (const match of nameMatches) {
      if (!seenIds.has(match.id)) {
        duplicates.push(match);
        seenIds.add(match.id);
      }
    }

    return duplicates;
  }
}
