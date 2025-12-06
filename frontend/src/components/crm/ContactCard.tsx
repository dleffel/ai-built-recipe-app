import React from 'react';
import { Contact } from '../../types/contact';
import styles from './ContactCard.module.css';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const primaryEmail = contact.emails.find(e => e.isPrimary) || contact.emails[0];
  const primaryPhone = contact.phones.find(p => p.isPrimary) || contact.phones[0];
  
  const subtitle = [contact.title, contact.company].filter(Boolean).join(' at ');

  return (
    <div 
      className={styles.card} 
      onClick={() => onClick(contact)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(contact);
        }
      }}
    >
      <div className={styles.header}>
        <h3 className={styles.name}>{fullName}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      
      <div className={styles.contactInfo}>
        {primaryEmail && (
          <span className={styles.email}>
            {primaryEmail.email}
          </span>
        )}
        {primaryEmail && primaryPhone && (
          <span className={styles.separator}>|</span>
        )}
        {primaryPhone && (
          <span className={styles.phone}>
            {primaryPhone.phone}
          </span>
        )}
      </div>
    </div>
  );
};

export default ContactCard;