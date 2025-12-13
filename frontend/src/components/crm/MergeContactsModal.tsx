import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Contact, MergeContactsDTO, FieldResolutionKey, FieldResolutionValue } from '../../types/contact';
import { contactApi } from '../../services/contactApi';
import { Button } from '../ui/Button';
import { formatBirthday } from '../../utils/birthdayUtils';
import styles from './MergeContactsModal.module.css';

interface MergeContactsModalProps {
  /** The primary contact (will be kept after merge) */
  primaryContact: Contact;
  /** Optional pre-selected secondary contact */
  secondaryContact?: Contact;
  /** Called when merge is complete */
  onMergeComplete: (mergedContact: Contact) => void;
  /** Called when modal is closed */
  onClose: () => void;
}

// Internal type that allows 'merge' for all fields during UI state
type FieldResolution = {
  [K in FieldResolutionKey]?: FieldResolutionValue;
};

// Convert internal field resolution to DTO format
const toFieldResolutionDTO = (resolution: FieldResolution): MergeContactsDTO['fieldResolution'] => {
  const result: MergeContactsDTO['fieldResolution'] = {};
  
  for (const [key, value] of Object.entries(resolution)) {
    const field = key as FieldResolutionKey;
    if (field === 'notes') {
      result.notes = value as 'primary' | 'secondary' | 'merge';
    } else if (value === 'primary' || value === 'secondary') {
      // Only 'primary' or 'secondary' are valid for non-notes fields
      (result as Record<string, 'primary' | 'secondary'>)[field] = value;
    }
  }
  
  return result;
};

const SEARCH_DEBOUNCE_MS = 300;

export const MergeContactsModal: React.FC<MergeContactsModalProps> = ({
  primaryContact,
  secondaryContact: initialSecondaryContact,
  onMergeComplete,
  onClose,
}) => {
  const [secondaryContact, setSecondaryContact] = useState<Contact | null>(initialSecondaryContact || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [fieldResolution, setFieldResolution] = useState<FieldResolution>({});
  const [mergeEmails, setMergeEmails] = useState(true);
  const [mergePhones, setMergePhones] = useState(true);
  const [mergeTags, setMergeTags] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search for contacts
  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const result = await contactApi.list({ search: query, take: 10 });
      // Filter out the primary contact from results
      const filtered = result.contacts.filter(c => c.id !== primaryContact.id);
      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching contacts:', err);
    } finally {
      setSearching(false);
    }
  }, [primaryContact.id]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchContacts(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchContacts]);

  const handleSelectContact = (contact: Contact) => {
    setSecondaryContact(contact);
    setSearchQuery('');
    setSearchResults([]);
    // Reset field resolution when selecting a new contact
    setFieldResolution({});
  };

  const handleRemoveSecondary = () => {
    setSecondaryContact(null);
    setFieldResolution({});
  };

  const handleFieldResolutionChange = (field: FieldResolutionKey, value: FieldResolutionValue) => {
    setFieldResolution(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMerge = async () => {
    if (!secondaryContact) return;

    setMerging(true);
    setError(null);

    try {
      const data: MergeContactsDTO = {
        primaryContactId: primaryContact.id,
        secondaryContactId: secondaryContact.id,
        fieldResolution: Object.keys(fieldResolution).length > 0 ? toFieldResolutionDTO(fieldResolution) : undefined,
        mergeEmails,
        mergePhones,
        mergeTags,
      };

      await contactApi.merge(data);
      
      // Fetch the updated contact
      const mergedContact = await contactApi.get(primaryContact.id);
      onMergeComplete(mergedContact);
    } catch (err) {
      console.error('Error merging contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge contacts');
    } finally {
      setMerging(false);
    }
  };

  const getFieldValue = (contact: Contact, field: FieldResolutionKey): string | null => {
    switch (field) {
      case 'firstName':
        return contact.firstName;
      case 'lastName':
        return contact.lastName;
      case 'company':
        return contact.company;
      case 'title':
        return contact.title;
      case 'notes':
        return contact.notes;
      case 'linkedInUrl':
        return contact.linkedInUrl;
      case 'birthday':
        return contact.birthday ? formatBirthday(contact.birthday) : null;
      default:
        return null;
    }
  };

  const getContactMeta = (contact: Contact): string => {
    const parts: string[] = [];
    if (contact.company) parts.push(contact.company);
    if (contact.emails.length > 0) parts.push(contact.emails[0].email);
    return parts.join(' - ');
  };

  const renderFieldRow = (field: FieldResolutionKey, label: string) => {
    if (!secondaryContact) return null;

    const primaryValue = getFieldValue(primaryContact, field);
    const secondaryValue = getFieldValue(secondaryContact, field);
    const resolution = fieldResolution[field] || 'primary';

    // If both values are the same or both empty, no need to show selection
    if (primaryValue === secondaryValue) {
      return null;
    }

    return (
      <div className={styles.fieldRow} key={field}>
        <div className={styles.fieldLabel}>{label}</div>
        <div
          className={`${styles.fieldOption} ${resolution === 'primary' ? styles.fieldOptionSelected : ''}`}
          onClick={() => handleFieldResolutionChange(field, 'primary')}
        >
          <div className={styles.fieldOptionLabel}>Primary Contact</div>
          <div className={primaryValue ? styles.fieldOptionValue : styles.fieldOptionEmpty}>
            {primaryValue || '(empty)'}
          </div>
        </div>
        <div
          className={`${styles.fieldOption} ${resolution === 'secondary' ? styles.fieldOptionSelected : ''}`}
          onClick={() => handleFieldResolutionChange(field, 'secondary')}
        >
          <div className={styles.fieldOptionLabel}>Secondary Contact</div>
          <div className={secondaryValue ? styles.fieldOptionValue : styles.fieldOptionEmpty}>
            {secondaryValue || '(empty)'}
          </div>
        </div>
      </div>
    );
  };

  const renderNotesFieldRow = () => {
    if (!secondaryContact) return null;

    const primaryValue = primaryContact.notes;
    const secondaryValue = secondaryContact.notes;
    const resolution = fieldResolution.notes || 'primary';

    // If both values are the same or both empty, no need to show selection
    if (primaryValue === secondaryValue) {
      return null;
    }

    // If both have notes, show merge option
    const showMergeOption = primaryValue && secondaryValue;

    return (
      <div className={styles.fieldRow} key="notes">
        <div className={styles.fieldLabel}>Notes</div>
        <div
          className={`${styles.fieldOption} ${resolution === 'primary' ? styles.fieldOptionSelected : ''}`}
          onClick={() => handleFieldResolutionChange('notes', 'primary')}
        >
          <div className={styles.fieldOptionLabel}>Primary Contact</div>
          <div className={primaryValue ? styles.fieldOptionValue : styles.fieldOptionEmpty}>
            {primaryValue ? (primaryValue.length > 100 ? primaryValue.slice(0, 100) + '...' : primaryValue) : '(empty)'}
          </div>
        </div>
        {showMergeOption ? (
          <div
            className={`${styles.fieldOption} ${resolution === 'merge' ? styles.fieldOptionSelected : ''}`}
            onClick={() => handleFieldResolutionChange('notes', 'merge')}
          >
            <div className={styles.fieldOptionLabel}>Merge Both</div>
            <div className={styles.fieldOptionValue}>
              Combine notes from both contacts
            </div>
          </div>
        ) : (
          <div
            className={`${styles.fieldOption} ${resolution === 'secondary' ? styles.fieldOptionSelected : ''}`}
            onClick={() => handleFieldResolutionChange('notes', 'secondary')}
          >
            <div className={styles.fieldOptionLabel}>Secondary Contact</div>
            <div className={secondaryValue ? styles.fieldOptionValue : styles.fieldOptionEmpty}>
              {secondaryValue ? (secondaryValue.length > 100 ? secondaryValue.slice(0, 100) + '...' : secondaryValue) : '(empty)'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Merge Contacts</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Merge another contact into <strong>{primaryContact.firstName} {primaryContact.lastName}</strong>.
            The selected contact will be merged and then deleted.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.contactSelector}>
            <label className={styles.selectorLabel}>Select contact to merge:</label>
            
            {!secondaryContact ? (
              <>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search contacts by name, email, or company..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                
                {searching && <div className={styles.loading}>Searching...</div>}
                
                {!searching && searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map(contact => (
                      <div
                        key={contact.id}
                        className={styles.searchResultItem}
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className={styles.searchResultName}>
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className={styles.searchResultMeta}>
                          {getContactMeta(contact)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!searching && searchQuery && searchResults.length === 0 && (
                  <div className={styles.noResults}>No contacts found</div>
                )}
              </>
            ) : (
              <div className={styles.selectedContact}>
                <div className={styles.selectedContactInfo}>
                  <div className={styles.selectedContactName}>
                    {secondaryContact.firstName} {secondaryContact.lastName}
                  </div>
                  <div className={styles.selectedContactMeta}>
                    {getContactMeta(secondaryContact)}
                  </div>
                </div>
                <button className={styles.removeButton} onClick={handleRemoveSecondary}>
                  &times;
                </button>
              </div>
            )}
          </div>

          {secondaryContact && (
            <>
              <div className={styles.mergePreview}>
                <h3 className={styles.previewTitle}>Resolve Field Conflicts</h3>
                <p className={styles.description}>
                  Choose which value to keep for fields that differ between contacts.
                  By default, the primary contact's values are used.
                </p>
                
                {renderFieldRow('firstName', 'First Name')}
                {renderFieldRow('lastName', 'Last Name')}
                {renderFieldRow('company', 'Company')}
                {renderFieldRow('title', 'Title')}
                {renderFieldRow('linkedInUrl', 'LinkedIn')}
                {renderFieldRow('birthday', 'Birthday')}
                {renderNotesFieldRow()}
              </div>

              <div className={styles.mergeOptions}>
                <h4 className={styles.mergeOptionsTitle}>Merge Options</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={mergeEmails}
                      onChange={e => setMergeEmails(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Merge email addresses ({secondaryContact.emails.length} from secondary)
                    </span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={mergePhones}
                      onChange={e => setMergePhones(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Merge phone numbers ({secondaryContact.phones.length} from secondary)
                    </span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={mergeTags}
                      onChange={e => setMergeTags(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Merge tags ({secondaryContact.tags.length} from secondary)
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={merging}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleMerge}
            disabled={!secondaryContact || merging}
            loading={merging}
          >
            {merging ? 'Merging...' : 'Merge Contacts'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MergeContactsModal;
