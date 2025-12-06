import React, { useState, useEffect } from 'react';
import { Contact, ContactVersion, ContactChanges } from '../../types/contact';
import { contactApi } from '../../services/contactApi';
import { ContactVersionDiff } from './ContactVersionDiff';
import styles from './ContactHistory.module.css';

interface ContactHistoryProps {
  contactId: string;
  onRestore: (contact: Contact) => void;
}

export const ContactHistory: React.FC<ContactHistoryProps> = ({
  contactId,
  onRestore,
}) => {
  const [versions, setVersions] = useState<ContactVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [contactId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contactApi.getVersions(contactId);
      setVersions(data);
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: number) => {
    try {
      setRestoring(version);
      const restoredContact = await contactApi.restoreVersion(contactId, version);
      onRestore(restoredContact);
      // Refresh versions after restore
      await fetchVersions();
    } catch (err) {
      console.error('Error restoring version:', err);
      setError('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const toggleExpanded = (version: number) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeSummary = (changes: ContactChanges): string => {
    const changedFields = Object.keys(changes);
    if (changedFields.length === 0) {
      return 'Initial version';
    }
    return `Changed: ${changedFields.join(', ')}`;
  };

  if (loading) {
    return <div className={styles.loading}>Loading version history...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (versions.length === 0) {
    return <div className={styles.empty}>No version history available</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Version History</h2>
      
      <div className={styles.versionList}>
        {versions.map((version, index) => {
          const isLatest = index === 0;
          const isExpanded = expandedVersion === version.version;
          
          return (
            <div key={version.id} className={styles.versionItem}>
              <div 
                className={styles.versionHeader}
                onClick={() => toggleExpanded(version.version)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded(version.version);
                  }
                }}
              >
                <div className={styles.versionInfo}>
                  <span className={styles.versionNumber}>
                    v{version.version}
                    {isLatest && <span className={styles.latestBadge}>Current</span>}
                  </span>
                  <span className={styles.versionDate}>
                    {formatDate(version.createdAt)}
                  </span>
                </div>
                <div className={styles.changeSummary}>
                  {getChangeSummary(version.changes)}
                </div>
                <div className={styles.versionActions}>
                  <button
                    className={styles.expandButton}
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  {!isLatest && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.version);
                      }}
                      className={styles.restoreButton}
                      disabled={restoring !== null}
                    >
                      {restoring === version.version ? 'Restoring...' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className={styles.versionDetails}>
                  <ContactVersionDiff 
                    changes={version.changes}
                    snapshot={version.snapshot}
                    isInitial={Object.keys(version.changes).length === 0}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContactHistory;