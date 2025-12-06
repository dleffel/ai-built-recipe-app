import React, { useState } from 'react';
import { toDateStringPT, createPTDate } from '../../utils/timezoneUtils';
import { Button, IconButton } from '../ui/Button';
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
          <IconButton
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
            onClick={onClose}
            disabled={isMoving}
            aria-label="Close"
            size="sm"
          />
        </div>
        
        <div className={styles.content}>
          <div className={styles.quickSelectSection}>
            <span className={styles.sectionLabel}>Quick select:</span>
            <div className={styles.quickSelectButtons}>
              <Button
                variant={selectedDate === todayString ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleQuickSelect(todayString)}
                disabled={isMoving}
              >
                Today
              </Button>
              <Button
                variant={selectedDate === tomorrowString ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleQuickSelect(tomorrowString)}
                disabled={isMoving}
              >
                Tomorrow
              </Button>
              <Button
                variant={selectedDate === nextWeekString ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleQuickSelect(nextWeekString)}
                disabled={isMoving}
              >
                Next Week
              </Button>
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
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={isMoving || !selectedDate}
            loading={isMoving}
          >
            {isMoving ? 'Moving...' : 'Move Tasks'}
          </Button>
        </div>
      </div>
    </div>
  );
};