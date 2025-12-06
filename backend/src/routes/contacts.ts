import { Router, RequestHandler } from 'express';
import { User } from '@prisma/client';
import { ContactService } from '../services/contactService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { requireAuth } from '../middleware/auth';
import { CreateContactDTO, UpdateContactDTO, ContactListParams } from '../types/contact';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// Create contact
const createContact: RequestHandler = async (req, res) => {
  try {
    const { firstName, lastName, company, title, notes, emails, phones } = req.body;
    
    if (!firstName || !lastName) {
      res.status(400).json({ 
        error: 'Missing required fields: firstName and lastName are required' 
      });
      return;
    }

    const data: CreateContactDTO = {
      firstName,
      lastName,
      company,
      title,
      notes,
      emails,
      phones,
    };

    const contact = await ContactService.createContact(req.user!.id, data);
    res.status(201).json(contact);
  } catch (error: unknown) {
    console.error('Create contact error:', error);
    if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid contact data' });
    } else {
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }
};

// Get all contacts for the current user
const getUserContacts: RequestHandler = async (req, res) => {
  try {
    const params: ContactListParams = {
      skip: parseInt(req.query.skip as string) || 0,
      take: parseInt(req.query.take as string) || 20,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as ContactListParams['sortBy'] || 'lastName',
      sortOrder: req.query.sortOrder as ContactListParams['sortOrder'] || 'asc',
    };
    
    const result = await ContactService.getContactsByUserId(req.user!.id, params);
    res.json(result);
  } catch (error: unknown) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// Get a single contact by ID
const getContact: RequestHandler = async (req, res) => {
  try {
    const contact = await ContactService.findById(req.params.id);
    
    if (!contact || contact.userId !== req.user!.id) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    if (contact.isDeleted) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error: unknown) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

// Update contact
const updateContact: RequestHandler = async (req, res) => {
  try {
    const data: UpdateContactDTO = req.body;

    const contact = await ContactService.updateContact(
      req.params.id,
      req.user!.id,
      data
    );
    res.json(contact);
  } catch (error: unknown) {
    console.error('Update contact error:', error);
    if (error instanceof Error && error.message === 'Contact not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error && error.message === 'Cannot update a deleted contact') {
      res.status(400).json({ error: error.message });
    } else if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid contact data' });
    } else {
      res.status(500).json({ error: 'Failed to update contact' });
    }
  }
};

// Delete contact (soft delete)
const deleteContact: RequestHandler = async (req, res) => {
  try {
    await ContactService.deleteContact(req.params.id, req.user!.id);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete contact error:', error);
    if (error instanceof Error && error.message === 'Contact not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  }
};

// Get version history for a contact
const getContactVersions: RequestHandler = async (req, res) => {
  try {
    const versions = await ContactService.getVersions(req.params.id, req.user!.id);
    res.json(versions);
  } catch (error: unknown) {
    console.error('Get contact versions error:', error);
    if (error instanceof Error && error.message === 'Contact not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch contact versions' });
    }
  }
};

// Get a specific version of a contact
const getContactVersion: RequestHandler = async (req, res) => {
  try {
    const version = parseInt(req.params.version);
    if (isNaN(version)) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }

    const versionRecord = await ContactService.getVersion(
      req.params.id,
      version,
      req.user!.id
    );

    if (!versionRecord) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    res.json(versionRecord);
  } catch (error: unknown) {
    console.error('Get contact version error:', error);
    if (error instanceof Error && error.message === 'Contact not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch contact version' });
    }
  }
};

// Restore a contact to a specific version
const restoreContactVersion: RequestHandler = async (req, res) => {
  try {
    const version = parseInt(req.params.version);
    if (isNaN(version)) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }

    const contact = await ContactService.restoreVersion(
      req.params.id,
      req.user!.id,
      version
    );
    res.json(contact);
  } catch (error: unknown) {
    console.error('Restore contact version error:', error);
    if (error instanceof Error && error.message === 'Contact not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error && error.message === 'Version not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to restore contact version' });
    }
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.post('/', createContact);
router.get('/', getUserContacts);
router.get('/:id', getContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.get('/:id/versions', getContactVersions);
router.get('/:id/versions/:version', getContactVersion);
router.post('/:id/restore/:version', restoreContactVersion);

export default router;