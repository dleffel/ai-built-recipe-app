import React from 'react';
import { ContactChanges, ContactSnapshot } from '../../types/contact';
import styles from './ContactVersionDiff.module.css';

interface ContactVersionDiffProps {
  changes: ContactChanges;
  snapshot: ContactSnapshot;
  isInitial: boolean;
}

export const ContactVersionDiff: React.FC<ContactVersionDiffProps> = ({
  changes,
  snapshot,
  isInitial,
}) => {
  if (isInitial) {
    return (
      <div className={styles.container}>
        <div className={styles.initialVersion}>
          <h4 className={styles.initialTitle}>Initial Version</h4>
          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotItem}>
              <span className={styles.snapshotLabel}>Name:</span>
              <span className={styles.snapshotValue}>
                {snapshot.firstName} {snapshot.lastName}
              </span>
            </div>
            {snapshot.company && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>Company:</span>
                <span className={styles.snapshotValue}>{snapshot.company}</span>
              </div>
            )}
            {snapshot.title && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>Title:</span>
                <span className={styles.snapshotValue}>{snapshot.title}</span>
              </div>
            )}
            {snapshot.linkedInUrl && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>LinkedIn:</span>
                <span className={styles.snapshotValue}>{snapshot.linkedInUrl}</span>
              </div>
            )}
            {snapshot.emails.length > 0 && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>Emails:</span>
                <span className={styles.snapshotValue}>
                  {snapshot.emails.map(e => e.email).join(', ')}
                </span>
              </div>
            )}
            {snapshot.phones.length > 0 && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>Phones:</span>
                <span className={styles.snapshotValue}>
                  {snapshot.phones.map(p => p.phone).join(', ')}
                </span>
              </div>
            )}
            {snapshot.notes && (
              <div className={styles.snapshotItem}>
                <span className={styles.snapshotLabel}>Notes:</span>
                <span className={styles.snapshotValue}>{snapshot.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '(none)';
      }
      // Handle email/phone arrays
      if (value[0] && typeof value[0] === 'object') {
        if ('email' in value[0]) {
          return value.map((e: any) => `${e.email} (${e.label})`).join(', ');
        }
        if ('phone' in value[0]) {
          return value.map((p: any) => `${p.phone} (${p.label})`).join(', ');
        }
      }
      return value.join(', ');
    }
    if (typeof value === 'string') {
      return value || '(empty)';
    }
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      company: 'Company',
      title: 'Title',
      linkedInUrl: 'LinkedIn URL',
      notes: 'Notes',
      emails: 'Emails',
      phones: 'Phones',
    };
    return labels[field] || field;
  };

  return (
    <div className={styles.container}>
      <div className={styles.changeList}>
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} className={styles.changeItem}>
            <div className={styles.fieldName}>{getFieldLabel(field)}</div>
            <div className={styles.changeValues}>
              <div className={styles.oldValue}>
                <span className={styles.changeIndicator}>-</span>
                <span className={styles.valueText}>{formatValue(change.from)}</span>
              </div>
              <div className={styles.newValue}>
                <span className={styles.changeIndicator}>+</span>
                <span className={styles.valueText}>{formatValue(change.to)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactVersionDiff;