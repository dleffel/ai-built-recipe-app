import React, { useState, useRef, useCallback } from 'react';
import { contactApi } from '../../services/contactApi';
import { ImportPreview, ImportResult } from '../../types/contact';
import { Button } from '../ui/Button';
import styles from './ImportContactsModal.module.css';

interface ImportContactsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = 'upload' | 'preview' | 'importing' | 'success' | 'error';

export const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [state, setState] = useState<ModalState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.vcf')) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please drop a .vcf file');
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setState('preview');

    try {
      const previewData = await contactApi.previewImport(selectedFile);
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse vCard file');
      setState('error');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setState('importing');
    setError(null);

    try {
      const importResult = await contactApi.importFromVCard(file, skipDuplicates);
      setResult(importResult);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
      setState('error');
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const handleRetry = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setState('upload');
  };

  const renderUploadState = () => (
    <>
      <h2>Import Contacts</h2>
      <div className={styles.instructions}>
        <p className={styles.instructionTitle}>📱 Export contacts from your iPhone:</p>
        <ol className={styles.instructionList}>
          <li>Open <strong>Settings</strong> on your iPhone</li>
          <li>Tap <strong>Contacts</strong></li>
          <li>Tap <strong>Export vCard</strong></li>
          <li>Save or share the .vcf file to your computer</li>
        </ol>
      </div>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={styles.dropZoneContent}>
          <span className={styles.dropZoneIcon}>📄</span>
          <span className={styles.dropZoneText}>
            Drop .vcf file here or click to browse
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          onChange={handleFileInputChange}
          className={styles.fileInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.buttons}>
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </>
  );

  const renderPreviewState = () => (
    <>
      <h2>Preview Import</h2>
      
      {preview && (
        <div className={styles.previewSummary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>📁</span>
            <span className={styles.summaryLabel}>File:</span>
            <span className={styles.summaryValue}>{file?.name}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>👥</span>
            <span className={styles.summaryLabel}>Total contacts:</span>
            <span className={styles.summaryValue}>{preview.total}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>✨</span>
            <span className={styles.summaryLabel}>New contacts:</span>
            <span className={styles.summaryValue}>{preview.newCount}</span>
          </div>
          {preview.duplicateCount > 0 && (
            <div className={`${styles.summaryItem} ${styles.warningItem}`}>
              <span className={styles.summaryIcon}>⚠️</span>
              <span className={styles.summaryLabel}>Duplicates found:</span>
              <span className={styles.summaryValue}>{preview.duplicateCount}</span>
            </div>
          )}
        </div>
      )}

      {preview && preview.duplicateCount > 0 && (
        <div className={styles.duplicateOption}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            <span>Skip duplicate contacts (recommended)</span>
          </label>
          <p className={styles.duplicateNote}>
            Contacts are considered duplicates if they share an email address.
          </p>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.buttons}>
        <Button variant="secondary" size="md" onClick={handleRetry}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleImport}
          disabled={!preview || preview.total === 0}
        >
          Import {preview ? (skipDuplicates ? preview.newCount : preview.total) : 0} Contacts
        </Button>
      </div>
    </>
  );

  const renderImportingState = () => (
    <>
      <h2>Importing Contacts</h2>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Please wait while your contacts are being imported...</p>
      </div>
    </>
  );

  const renderSuccessState = () => (
    <>
      <h2>Import Complete</h2>
      
      {result && (
        <div className={styles.resultSummary}>
          <div className={styles.successIcon}>✅</div>
          <p className={styles.successMessage}>
            Successfully imported {result.created} contact{result.created !== 1 ? 's' : ''}
          </p>
          
          <ul className={styles.resultList}>
            <li>
              <span className={styles.resultLabel}>Created:</span>
              <span className={styles.resultValue}>{result.created}</span>
            </li>
            {result.skipped > 0 && (
              <li>
                <span className={styles.resultLabel}>Skipped (duplicates):</span>
                <span className={styles.resultValue}>{result.skipped}</span>
              </li>
            )}
            {result.errors > 0 && (
              <li>
                <span className={styles.resultLabel}>Errors:</span>
                <span className={styles.resultValue}>{result.errors}</span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className={styles.buttons}>
        <Button variant="primary" size="md" onClick={handleDone}>
          Done
        </Button>
      </div>
    </>
  );

  const renderErrorState = () => (
    <>
      <h2>Import Failed</h2>
      
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>❌</div>
        <p className={styles.errorMessage}>{error || 'An unknown error occurred'}</p>
      </div>

      <div className={styles.buttons}>
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    </>
  );

  const renderContent = () => {
    switch (state) {
      case 'upload':
        return renderUploadState();
      case 'preview':
        return renderPreviewState();
      case 'importing':
        return renderImportingState();
      case 'success':
        return renderSuccessState();
      case 'error':
        return renderErrorState();
      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ImportContactsModal;
