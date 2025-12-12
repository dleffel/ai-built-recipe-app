import React from 'react';
import { Contact } from '../../types/contact';
import { TagPill } from '../ui/TagPill';
import styles from './ContactCard.module.css';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
}

const MAX_VISIBLE_TAGS = 3;

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const primaryEmail = contact.emails.find(e => e.isPrimary) || contact.emails[0];
  const primaryPhone = contact.phones.find(p => p.isPrimary) || contact.phones[0];
  
  const subtitle = [contact.title, contact.company].filter(Boolean).join(' at ');
  
  // Get tags to display
  const tags = contact.tags || [];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = tags.length - MAX_VISIBLE_TAGS;

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

      {tags.length > 0 && (
        <div className={styles.tags}>
          {visibleTags.map((ct) => (
            <TagPill key={ct.id} name={ct.tag.name} size="sm" />
          ))}
          {remainingTagCount > 0 && (
            <span className={styles.moreTagsIndicator}>
              +{remainingTagCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactCard;
