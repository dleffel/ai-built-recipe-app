import React, { useState, useEffect, useCallback } from 'react';
import { GmailAccount } from '../../types/gmail';
import {
  getGmailAccounts,
  connectGmailAccount,
  activateGmailAccount,
  deactivateGmailAccount,
  disconnectGmailAccount,
} from '../../services/gmailApi';
import { Button } from '../ui/Button';
import styles from './GmailSettings.module.css';

/**
 * Gmail Settings Component
 * Allows users to manage their connected Gmail accounts
 */
export const GmailSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const errorParam = params.get('error');

    if (success) {
      // Clear the URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (errorParam) {
      setError(getErrorMessage(errorParam));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'oauth_denied':
        return 'Gmail access was denied. Please try again and grant the required permissions.';
      case 'missing_code':
        return 'Authorization failed. Please try again.';
      case 'invalid_state':
        return 'Session expired. Please try connecting again.';
      case 'connection_failed':
        return 'Failed to connect Gmail account. Please try again.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGmailAccounts();
      setAccounts(data);
    } catch (err) {
      setError('Failed to load Gmail accounts');
      console.error('Error fetching Gmail accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async () => {
    try {
      setActionLoading('connect');
      const authUrl = await connectGmailAccount();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate Gmail connection');
      console.error('Error connecting Gmail:', err);
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (account: GmailAccount) => {
    try {
      setActionLoading(account.id);
      if (account.isActive) {
        await deactivateGmailAccount(account.id);
      } else {
        await activateGmailAccount(account.id);
      }
      await fetchAccounts();
    } catch (err) {
      setError(`Failed to ${account.isActive ? 'pause' : 'resume'} monitoring`);
      console.error('Error toggling account:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (account: GmailAccount) => {
    if (!window.confirm(`Are you sure you want to disconnect ${account.email}?`)) {
      return;
    }

    try {
      setActionLoading(account.id);
      await disconnectGmailAccount(account.id);
      await fetchAccounts();
    } catch (err) {
      setError('Failed to disconnect Gmail account');
      console.error('Error disconnecting account:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Gmail Integration</h2>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Gmail Integration</h2>
        <p className={styles.description}>
          Connect your Gmail accounts to monitor incoming and outgoing emails.
          New emails will be automatically processed and logged.
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button 
            className={styles.dismissError}
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            x
          </button>
        </div>
      )}

      <div className={styles.accountList}>
        {accounts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No Gmail accounts connected yet.</p>
            <p>Connect your Gmail account to start monitoring emails.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className={styles.accountCard}>
              <div className={styles.accountInfo}>
                <div className={styles.accountEmail}>
                  {account.email}
                  {account.isPrimary && (
                    <span className={styles.primaryBadge}>Primary</span>
                  )}
                </div>
                <div className={styles.accountMeta}>
                  <span className={account.isActive ? styles.statusActive : styles.statusInactive}>
                    {account.isActive ? 'Monitoring' : 'Paused'}
                  </span>
                  <span className={styles.lastSync}>
                    Last sync: {formatDate(account.lastSyncAt)}
                  </span>
                </div>
              </div>
              <div className={styles.accountActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(account)}
                  loading={actionLoading === account.id}
                  disabled={actionLoading !== null}
                >
                  {account.isActive ? 'Pause' : 'Resume'}
                </Button>
                {!account.isPrimary && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDisconnect(account)}
                    loading={actionLoading === account.id}
                    disabled={actionLoading !== null}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleConnect}
          loading={actionLoading === 'connect'}
          disabled={actionLoading !== null}
        >
          Connect Gmail Account
        </Button>
      </div>

      <div className={styles.info}>
        <h3>How it works</h3>
        <ul>
          <li>Connect your Gmail account using Google OAuth</li>
          <li>We monitor your inbox and sent mail for new messages</li>
          <li>Each new email triggers an action (currently logging for POC)</li>
          <li>Your primary account is automatically enrolled when you log in</li>
          <li>You can connect additional Gmail accounts for monitoring</li>
        </ul>
      </div>
    </div>
  );
};

export default GmailSettings;