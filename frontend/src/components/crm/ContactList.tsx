import React, { useState, useEffect, useCallback } from 'react';
import { Contact, ContactListParams } from '../../types/contact';
import { contactApi } from '../../services/contactApi';
import { ContactCard } from './ContactCard';
import { Button, IconButton } from '../ui/Button';
import styles from './ContactList.module.css';

interface ContactListProps {
  onContactClick: (contact: Contact) => void;
  onCreateClick: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({ 
  onContactClick, 
  onCreateClick 
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    take: 20,
  });

  const fetchContacts = useCallback(async (params: ContactListParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await contactApi.list({
        skip: params.skip ?? pagination.skip,
        take: params.take ?? pagination.take,
        search: params.search ?? (searchQuery || undefined),
        sortBy: 'lastName',
        sortOrder: 'asc',
      });
      setContacts(result.contacts);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [pagination.skip, pagination.take, searchQuery]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts({ skip: 0, search: searchQuery || undefined });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchContacts({ skip: 0, search: undefined });
  };

  const handlePrevPage = () => {
    if (pagination.skip > 0) {
      const newSkip = Math.max(0, pagination.skip - pagination.take);
      fetchContacts({ skip: newSkip });
    }
  };

  const handleNextPage = () => {
    if (pagination.skip + pagination.take < pagination.total) {
      fetchContacts({ skip: pagination.skip + pagination.take });
    }
  };

  const currentPage = Math.floor(pagination.skip / pagination.take) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.take);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          {searchQuery && (
            <IconButton
              icon={<span>&times;</span>}
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className={styles.clearButton}
            />
          )}
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>
        <Button variant="primary" size="md" onClick={onCreateClick}>
          + New Contact
        </Button>
      </div>

      {loading && contacts.length === 0 ? (
        <div className={styles.loading}>Loading contacts...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : contacts.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? (
            <p>No contacts found matching "{searchQuery}"</p>
          ) : (
            <>
              <p>No contacts yet</p>
              <Button variant="primary" size="md" onClick={onCreateClick}>
                Create your first contact
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={onContactClick}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Showing {pagination.skip + 1}-{Math.min(pagination.skip + pagination.take, pagination.total)} of {pagination.total} contacts
              </span>
              <div className={styles.paginationButtons}>
                <IconButton
                  icon={<span>&lt;</span>}
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={pagination.skip === 0}
                  aria-label="Previous page"
                />
                <span className={styles.pageNumber}>
                  {currentPage} / {totalPages}
                </span>
                <IconButton
                  icon={<span>&gt;</span>}
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={pagination.skip + pagination.take >= pagination.total}
                  aria-label="Next page"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContactList;