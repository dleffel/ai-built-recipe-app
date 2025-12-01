import React, { useState } from 'react';
import { toDateStringPT, createPTDate } from '../../utils/timezoneUtils';
import styles from './BulkMoveDatePicker.module.css';

interface BulkMoveDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  selectedCount: number;
  isMoving: boolean;
}

export const BulkMoveDatePicker: React.FC<BulkMoveDatePickerProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedCount,
  isMoving
}) => {
  const today = createPTDate(new Date());
  const todayString = toDateStringPT(today);
  
  const [selectedDate, setSelectedDate] = useState(todayString);
  
  if (!isOpen) {
    return null;
  }
  
  // Calculate quick select dates
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = toDateStringPT(tomorrow);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekString = toDateStringPT(nextWeek);
  
  const handleQuickSelect = (date: string) => {
    setSelectedDate(date);
  };
  
  const handleConfirm = () => {
    onSelectDate(selectedDate);
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            Move {selectedCount} task{selectedCount !== 1 ? 's' : ''} to...
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isMoving}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.quickSelectSection}>
            <span className={styles.sectionLabel}>Quick select:</span>
            <div className={styles.quickSelectButtons}>
              <button
                className={`${styles.quickSelectButton} ${selectedDate === todayString ? styles.active : ''}`}
                onClick={() => handleQuickSelect(todayString)}
                disabled={isMoving}
              >
                Today
              </button>
              <button
                className={`${styles.quickSelectButton} ${selectedDate === tomorrowString ? styles.active : ''}`}
                onClick={() => handleQuickSelect(tomorrowString)}
                disabled={isMoving}
              >
                Tomorrow
              </button>
              <button
                className={`${styles.quickSelectButton} ${selectedDate === nextWeekString ? styles.active : ''}`}
                onClick={() => handleQuickSelect(nextWeekString)}
                disabled={isMoving}
              >
                Next Week
              </button>
            </div>
          </div>
          
          <div className={styles.datePickerSection}>
            <label htmlFor="bulk-move-date" className={styles.sectionLabel}>
              Or select a date:
            </label>
            <input
              id="bulk-move-date"
              type="date"
              className={styles.datePicker}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isMoving}
            />
          </div>
        </div>
        
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isMoving || !selectedDate}
          >
            {isMoving ? (
              <>
                <span className={styles.loadingSpinner}></span>
                Moving...
              </>
            ) : (
              'Move Tasks'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};