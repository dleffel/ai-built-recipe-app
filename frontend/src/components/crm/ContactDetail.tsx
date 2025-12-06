import React, { useState } from 'react';
import { Contact } from '../../types/contact';
import { ContactHistory } from './ContactHistory';
import styles from './ContactDetail.module.css';

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onBack: () => void;
  onContactUpdated: (contact: Contact) => void;
}

type TabType = 'details' | 'history';

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contact,
  onEdit,
  onDelete,
  onBack,
  onContactUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const subtitle = [contact.title, contact.company].filter(Boolean).join(' at ');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      console.error('Error deleting contact:', err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const primaryEmail = contact.emails.find(e => e.isPrimary) || contact.emails[0];
  const primaryPhone = contact.phones.find(p => p.isPrimary) || contact.phones[0];
  const otherEmails = contact.emails.filter(e => e !== primaryEmail);
  const otherPhones = contact.phones.filter(p => p !== primaryPhone);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          &larr; Back
        </button>
        <div className={styles.actions}>
          <button onClick={onEdit} className={styles.editButton}>
            Edit
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className={styles.deleteButton}
          >
            Delete
          </button>
        </div>
      </div>

      <div className={styles.profile}>
        <h1 className={styles.name}>{fullName}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'details' ? (
          <div className={styles.details}>
            {(contact.emails.length > 0 || contact.phones.length > 0) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Contact Information</h2>
                
                {contact.emails.length > 0 && (
                  <div className={styles.infoGroup}>
                    <h3 className={styles.infoLabel}>Email</h3>
                    <div className={styles.infoList}>
                      {primaryEmail && (
                        <div className={styles.infoItem}>
                          <a href={`mailto:${primaryEmail.email}`} className={styles.link}>
                            {primaryEmail.email}
                          </a>
                          <span className={styles.itemLabel}>({primaryEmail.label})</span>
                          <span className={styles.primaryBadge}>Primary</span>
                        </div>
                      )}
                      {otherEmails.map((email, index) => (
                        <div key={index} className={styles.infoItem}>
                          <a href={`mailto:${email.email}`} className={styles.link}>
                            {email.email}
                          </a>
                          <span className={styles.itemLabel}>({email.label})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contact.phones.length > 0 && (
                  <div className={styles.infoGroup}>
                    <h3 className={styles.infoLabel}>Phone</h3>
                    <div className={styles.infoList}>
                      {primaryPhone && (
                        <div className={styles.infoItem}>
                          <a href={`tel:${primaryPhone.phone}`} className={styles.link}>
                            {primaryPhone.phone}
                          </a>
                          <span className={styles.itemLabel}>({primaryPhone.label})</span>
                          <span className={styles.primaryBadge}>Primary</span>
                        </div>
                      )}
                      {otherPhones.map((phone, index) => (
                        <div key={index} className={styles.infoItem}>
                          <a href={`tel:${phone.phone}`} className={styles.link}>
                            {phone.phone}
                          </a>
                          <span className={styles.itemLabel}>({phone.label})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {contact.notes && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Notes</h2>
                <p className={styles.notes}>{contact.notes}</p>
              </section>
            )}

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Metadata</h2>
              <div className={styles.metadata}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Created:</span>
                  <span className={styles.metaValue}>
                    {new Date(contact.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Last Updated:</span>
                  <span className={styles.metaValue}>
                    {new Date(contact.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <ContactHistory 
            contactId={contact.id} 
            onRestore={onContactUpdated}
          />
        )}
      </div>

      {showDeleteConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Contact</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete {fullName}? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={styles.modalCancel}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={styles.modalDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactDetail;