import React, { useState } from 'react';
import { Contact, CreateContactDTO, EMAIL_LABELS, PHONE_LABELS } from '../../types/contact';
import { MultiValueInput } from './MultiValueInput';
import { Button } from '../ui/Button';
import styles from './ContactForm.module.css';

interface ContactFormProps {
  contact?: Contact;
  onSubmit: (data: CreateContactDTO) => Promise<void>;
  onCancel: () => void;
}

interface EmailItem {
  value: string;
  label: string;
  isPrimary: boolean;
}

interface PhoneItem {
  value: string;
  label: string;
  isPrimary: boolean;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const [firstName, setFirstName] = useState(contact?.firstName || '');
  const [lastName, setLastName] = useState(contact?.lastName || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [title, setTitle] = useState(contact?.title || '');
  const [notes, setNotes] = useState(contact?.notes || '');
  const [emails, setEmails] = useState<EmailItem[]>(
    contact?.emails.map(e => ({
      value: e.email,
      label: e.label,
      isPrimary: e.isPrimary,
    })) || []
  );
  const [phones, setPhones] = useState<PhoneItem[]>(
    contact?.phones.map(p => ({
      value: p.phone,
      label: p.label,
      isPrimary: p.isPrimary,
    })) || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!contact;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateContactDTO = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        emails: emails.map(e => ({
          email: e.value,
          label: e.label,
          isPrimary: e.isPrimary,
        })),
        phones: phones.map(p => ({
          phone: p.value,
          label: p.label,
          isPrimary: p.isPrimary,
        })),
      };

      await onSubmit(data);
    } catch (err) {
      console.error('Error submitting contact:', err);
      setError('Failed to save contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>
        {isEditing ? 'Edit Contact' : 'New Contact'}
      </h2>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Information</h3>
        
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="firstName" className={styles.label}>
              First Name <span className={styles.required}>*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="lastName" className={styles.label}>
              Last Name <span className={styles.required}>*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={styles.input}
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="company" className={styles.label}>
              Company
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Contact Information</h3>
        
        <div className={styles.field}>
          <label className={styles.label}>Email Addresses</label>
          <MultiValueInput
            items={emails}
            onChange={setEmails}
            labels={EMAIL_LABELS}
            placeholder="Enter email address"
            type="email"
            fieldName="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Phone Numbers</label>
          <MultiValueInput
            items={phones}
            onChange={setPhones}
            labels={PHONE_LABELS}
            placeholder="Enter phone number"
            type="tel"
            fieldName="phone"
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Notes</h3>
        
        <div className={styles.field}>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.textarea}
            rows={4}
            placeholder="Add any notes about this contact..."
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={submitting}
          loading={submitting}
        >
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;