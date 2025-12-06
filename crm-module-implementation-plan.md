# CRM Module Implementation Plan

## Overview

This document outlines the implementation of a personal/professional CRM module for the recipe app. The CRM is a new tab in the navigation, providing contact management with full version history tracking.

## Requirements Summary

- **Contact Type**: Single unified contact type
- **Fields**: firstName, lastName, emails (multiple with labels), phones (multiple with labels), company, title, notes
- **Versioning**: Batch versioning per edit session with change tracking
- **Search**: Full text search across all fields
- **History**: Dedicated history tab on contact detail view

## Implementation Status

### Phase 1: Database and Backend Foundation - COMPLETED

Files created/modified:
- `backend/prisma/schema.prisma` - Added Contact, ContactEmail, ContactPhone, ContactVersion models
- `backend/prisma/migrations/20251206120000_add_contact_models/migration.sql` - Database migration
- `backend/src/types/contact.ts` - TypeScript type definitions
- `backend/src/services/contactService.ts` - Business logic with versioning
- `backend/src/routes/contacts.ts` - REST API endpoints
- `backend/src/server.ts` - Added contact routes

### Phase 2: Frontend Foundation - COMPLETED

Files created:
- `frontend/src/types/contact.ts` - Frontend TypeScript interfaces
- `frontend/src/services/contactApi.ts` - API client service

### Phase 3: Contact Management UI - COMPLETED

Files created:
- `frontend/src/components/crm/ContactCard.tsx` - Contact card for list display
- `frontend/src/components/crm/ContactCard.module.css`
- `frontend/src/components/crm/ContactList.tsx` - Main list view with search
- `frontend/src/components/crm/ContactList.module.css`
- `frontend/src/components/crm/ContactDetail.tsx` - Detail view with tabs
- `frontend/src/components/crm/ContactDetail.module.css`
- `frontend/src/components/crm/ContactForm.tsx` - Create/Edit form
- `frontend/src/components/crm/ContactForm.module.css`
- `frontend/src/components/crm/MultiValueInput.tsx` - For emails/phones with labels
- `frontend/src/components/crm/MultiValueInput.module.css`

### Phase 4: Version History - COMPLETED

Files created:
- `frontend/src/components/crm/ContactHistory.tsx` - Version history tab
- `frontend/src/components/crm/ContactHistory.module.css`
- `frontend/src/components/crm/ContactVersionDiff.tsx` - Shows changes between versions
- `frontend/src/components/crm/ContactVersionDiff.module.css`
- `frontend/src/components/crm/index.ts` - Component exports

### Phase 5: Integration - COMPLETED

Files modified:
- `frontend/src/App.tsx` - Added CRM routes and page components
- `frontend/src/components/layout/Navigation.tsx` - Added CRM navigation link

## Data Model

### Contact
```prisma
model Contact {
  id          String    @id @default(uuid())
  firstName   String
  lastName    String
  company     String?
  title       String?
  notes       String?
  isDeleted   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  userId      String
  user        User      @relation(...)
  emails      ContactEmail[]
  phones      ContactPhone[]
  versions    ContactVersion[]
}
```

### ContactEmail
```prisma
model ContactEmail {
  id          String    @id @default(uuid())
  email       String
  label       String    // "work", "personal", "other"
  isPrimary   Boolean   @default(false)
  contactId   String
  contact     Contact   @relation(...)
}
```

### ContactPhone
```prisma
model ContactPhone {
  id          String    @id @default(uuid())
  phone       String
  label       String    // "mobile", "work", "home", "other"
  isPrimary   Boolean   @default(false)
  contactId   String
  contact     Contact   @relation(...)
}
```

### ContactVersion
```prisma
model ContactVersion {
  id          String    @id @default(uuid())
  version     Int       // Sequential version number
  snapshot    Json      // Full snapshot of contact data
  changes     Json      // What changed from previous version
  createdAt   DateTime  @default(now())
  contactId   String
  contact     Contact   @relation(...)
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts` | Create a new contact |
| GET | `/api/contacts` | List contacts with pagination and search |
| GET | `/api/contacts/:id` | Get a single contact |
| PUT | `/api/contacts/:id` | Update a contact (creates new version) |
| DELETE | `/api/contacts/:id` | Soft delete a contact |
| GET | `/api/contacts/:id/versions` | Get version history |
| GET | `/api/contacts/:id/versions/:version` | Get specific version |
| POST | `/api/contacts/:id/restore/:version` | Restore to version |

## Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/contacts` | ContactListPage | List all contacts |
| `/contacts/new` | ContactFormPage | Create new contact |
| `/contacts/:id` | ContactDetailPage | View contact details |
| `/contacts/:id/edit` | ContactFormPage | Edit contact |

## Deployment Steps

1. Run Prisma migration: `npx prisma migrate deploy`
2. Generate Prisma client: `npx prisma generate`
3. Deploy backend changes
4. Deploy frontend changes

## Future Enhancements

1. **Contact Types**: Add Person vs Organization distinction
2. **Relationships**: Link contacts to each other
3. **Custom Fields**: User-defined additional fields
4. **Tags/Categories**: Organize contacts with tags
5. **Import/Export**: CSV import and export
6. **Agentic Integration**: API for automated data enrichment
7. **Activity Timeline**: Track interactions
8. **Duplicate Detection**: Identify and merge duplicates
9. **Bulk Operations**: Bulk edit and delete
10. **Advanced Search**: Full-text search with Elasticsearch