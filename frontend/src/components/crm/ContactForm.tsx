import React, { useState } from 'react';
import { Contact, CreateContactDTO, UpdateContactDTO, EMAIL_LABELS, PHONE_LABELS } from '../../types/contact';
import { MultiValueInput } from './MultiValueInput';
import { Button } from '../ui/Button';
import { parseBirthdayComponents, parseBirthdayInput, isValidBirthday } from '../../utils/birthdayUtils';
import styles from './ContactForm.module.css';

interface ContactFormProps {
  contact?: Contact;
  onSubmit: (data: CreateContactDTO | UpdateContactDTO) => Promise<void>;
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
  // Parse existing birthday into components
  const existingBirthday = parseBirthdayComponents(contact?.birthday || null);
  
  const [firstName, setFirstName] = useState(contact?.firstName || '');
  const [lastName, setLastName] = useState(contact?.lastName || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [title, setTitle] = useState(contact?.title || '');
  const [linkedInUrl, setLinkedInUrl] = useState(contact?.linkedInUrl || '');
  const [birthdayMonth, setBirthdayMonth] = useState<string>(
    existingBirthday.month ? String(existingBirthday.month) : ''
  );
  const [birthdayDay, setBirthdayDay] = useState<string>(
    existingBirthday.day ? String(existingBirthday.day) : ''
  );
  const [birthdayYear, setBirthdayYear] = useState<string>(
    existingBirthday.year ? String(existingBirthday.year) : ''
  );
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
      // Build birthday value if month and day are provided
      let birthdayValue: string | null | undefined;
      if (birthdayMonth && birthdayDay) {
        const month = parseInt(birthdayMonth, 10);
        const day = parseInt(birthdayDay, 10);
        const year = birthdayYear ? parseInt(birthdayYear, 10) : undefined;
        
        if (isValidBirthday(month, day, year)) {
          birthdayValue = parseBirthdayInput(month, day, year);
        }
      } else if (isEditing && contact?.birthday) {
        // If editing and the contact had a birthday but fields are now empty, explicitly clear it
        birthdayValue = null;
      }

      // Use UpdateContactDTO when editing to allow null values for clearing fields
      const data: CreateContactDTO | UpdateContactDTO = isEditing ? {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || null,
        title: title.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        birthday: birthdayValue,
        notes: notes.trim() || null,
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
      } : {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        birthday: birthdayValue || undefined,
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

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="linkedInUrl" className={styles.label}>
              LinkedIn Profile URL
            </label>
            <input
              id="linkedInUrl"
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              className={styles.input}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Birthday</label>
            <div className={styles.birthdayInputs}>
              <select
                id="birthdayMonth"
                value={birthdayMonth}
                onChange={(e) => setBirthdayMonth(e.target.value)}
                className={styles.select}
                aria-label="Birthday month"
              >
                <option value="">Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select
                id="birthdayDay"
                value={birthdayDay}
                onChange={(e) => setBirthdayDay(e.target.value)}
                className={styles.select}
                aria-label="Birthday day"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input
                id="birthdayYear"
                type="text"
                value={birthdayYear}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 4) {
                    setBirthdayYear(value);
                  }
                }}
                className={styles.yearInput}
                placeholder="Year (optional)"
                aria-label="Birthday year (optional)"
                maxLength={4}
              />
            </div>
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