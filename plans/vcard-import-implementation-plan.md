# vCard Import Implementation Plan

## Overview

Enable users to import contacts from their iPhone by uploading a vCard (.vcf) file exported from their device. This provides a simple one-time import mechanism to populate the CRM with existing contacts.

## User Flow

1. User exports contacts from iPhone (Settings > Contacts > Export vCard)
2. User navigates to CRM Contacts page
3. User clicks "Import" button
4. Modal opens with file upload area
5. User uploads .vcf file
6. System parses and displays preview of contacts to import
7. User reviews and confirms import
8. Contacts are created in CRM with duplicate detection

## Technical Design

### vCard Format Reference

A vCard file (.vcf) contains contacts in this format:

```vcf
BEGIN:VCARD
VERSION:3.0
N:Smith;John;;;
FN:John Smith
ORG:Acme Corp
TITLE:Software Engineer
TEL;TYPE=CELL:+1-555-123-4567
TEL;TYPE=WORK:+1-555-987-6543
EMAIL;TYPE=HOME:john@personal.com
EMAIL;TYPE=WORK:john@acme.com
NOTE:Met at conference 2024
BDAY:1985-03-15
END:VCARD
```

Multiple contacts are concatenated in a single file.

### Field Mapping

| vCard Field | CRM Field | Notes |
|-------------|-----------|-------|
| `N` (structured name) | `firstName`, `lastName` | Parse components |
| `FN` (formatted name) | Fallback for name | If N is missing |
| `ORG` | `company` | Organization name |
| `TITLE` | `title` | Job title |
| `TEL` | `phones[]` | Multiple, with TYPE for label |
| `EMAIL` | `emails[]` | Multiple, with TYPE for label |
| `NOTE` | `notes` | Free text notes |
| `BDAY` | `birthday` | Date parsing required |
| `URL` (LinkedIn) | `linkedInUrl` | If URL contains linkedin.com |

### Label Mapping

| vCard TYPE | CRM Label |
|------------|-----------|
| `CELL`, `MOBILE` | `mobile` |
| `WORK` | `work` |
| `HOME` | `home` |
| `PREF` (email) | `isPrimary: true` |
| Other/missing | `other` |

## Implementation Tasks

### Backend

#### 1. Install vCard Parser
- Add `vcard-parser` or `ical.js` npm package to backend
- These handle vCard 3.0 and 4.0 formats

#### 2. Create vCard Service (`backend/src/services/vcardService.ts`)

```typescript
interface ParsedVCard {
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  notes?: string;
  birthday?: string;
  linkedInUrl?: string;
  emails: Array<{ email: string; label: string; isPrimary: boolean }>;
  phones: Array<{ phone: string; label: string; isPrimary: boolean }>;
}

interface ImportResult {
  created: number;
  skipped: number;
  duplicates: Array<{ imported: ParsedVCard; existing: Contact }>;
}

class VCardService {
  // Parse vCard file content into structured contacts
  static parseVCardFile(content: string): ParsedVCard[];
  
  // Import parsed contacts into CRM, detecting duplicates
  static importContacts(
    userId: string, 
    contacts: ParsedVCard[],
    options: { skipDuplicates: boolean }
  ): Promise<ImportResult>;
  
  // Check if contact already exists (by email match)
  static findDuplicate(userId: string, contact: ParsedVCard): Promise<Contact | null>;
}
```

#### 3. Create Import Route (`backend/src/routes/contacts.ts`)

Add endpoint:
```
POST /api/contacts/import
Content-Type: multipart/form-data
Body: { file: .vcf file }

Response: {
  created: 45,
  skipped: 3,
  duplicates: [...]
}
```

#### 4. Duplicate Detection Logic

A contact is considered a duplicate if:
- Any email address matches an existing contact's email (case-insensitive)
- OR first name + last name + phone number all match

### Frontend

#### 5. Create Import Modal Component (`frontend/src/components/crm/ImportContactsModal.tsx`)

Features:
- File drop zone for .vcf upload
- Preview of contacts to be imported
- Duplicate warning display
- Import button with loading state
- Success/error feedback

#### 6. Add Import API Function (`frontend/src/services/contactApi.ts`)

```typescript
export const importContactsFromVCard = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/contacts/import', formData);
  return response.data;
};
```

#### 7. Add Import Button to ContactList

Add "Import" button next to existing "New Contact" button in the contacts list header.

## File Changes Summary

### New Files
- `backend/src/services/vcardService.ts` - vCard parsing and import logic
- `frontend/src/components/crm/ImportContactsModal.tsx` - Import UI modal
- `frontend/src/components/crm/ImportContactsModal.module.css` - Modal styles

### Modified Files
- `backend/package.json` - Add vCard parser dependency
- `backend/src/routes/contacts.ts` - Add import endpoint
- `frontend/src/services/contactApi.ts` - Add import API function
- `frontend/src/components/crm/ContactList.tsx` - Add import button

## Testing

### Manual Testing
1. Export contacts from iPhone as .vcf file
2. Upload to CRM import modal
3. Verify contacts created correctly
4. Test with duplicate contacts
5. Test with malformed/partial vCard data

### Unit Tests
- vCard parsing with various formats
- Duplicate detection logic
- Field mapping edge cases

## Edge Cases to Handle

1. **Empty/missing names**: Use email prefix or "Unknown Contact"
2. **Malformed vCard**: Skip invalid entries, report errors
3. **Very large files**: Consider chunked processing for 1000+ contacts
4. **International phone numbers**: Preserve as-is
5. **Special characters in notes**: Proper escaping
6. **Multiple vCard versions**: Support v3.0 and v4.0

## UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│  Import Contacts                                    [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📱 Import from iPhone                                  │
│                                                         │
│  Export your contacts from iPhone:                      │
│  Settings → Contacts → Export vCard                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │     📄 Drop .vcf file here                      │   │
│  │        or click to browse                       │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Preview: 47 contacts found                             │
│                                                         │
│  ⚠️ 3 potential duplicates detected                    │
│     (contacts with matching emails will be skipped)     │
│                                                         │
│  ☑ Skip duplicates                                      │
│                                                         │
│                              [Cancel]  [Import 44]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Success State

```
┌─────────────────────────────────────────────────────────┐
│  Import Complete                                    [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Successfully imported 44 contacts                   │
│                                                         │
│  • 44 contacts created                                  │
│  • 3 duplicates skipped                                 │
│                                                         │
│                                          [Done]         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Order

1. Backend: Add vCard parser dependency
2. Backend: Create vcardService.ts with parsing logic
3. Backend: Add import route to contacts.ts
4. Frontend: Add import API function
5. Frontend: Create ImportContactsModal component
6. Frontend: Add import button to ContactList
7. Test end-to-end
8. Handle edge cases and polish

## Future Enhancements (Out of Scope)

- CSV import option
- Google Contacts direct import via API
- Bulk duplicate merge UI
- Import history/undo
