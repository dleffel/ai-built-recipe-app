import React, { useState, useRef, useEffect } from 'react';
import styles from './SortDropdown.module.css';

export type SortField = 'title' | 'prepTime' | 'cookTime' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'updatedAt', order: 'desc', label: 'Recently Updated' },
  { field: 'createdAt', order: 'desc', label: 'Newest First' },
  { field: 'createdAt', order: 'asc', label: 'Oldest First' },
  { field: 'title', order: 'asc', label: 'Title A-Z' },
  { field: 'title', order: 'desc', label: 'Title Z-A' },
  { field: 'prepTime', order: 'asc', label: 'Prep Time (Low to High)' },
  { field: 'prepTime', order: 'desc', label: 'Prep Time (High to Low)' },
  { field: 'cookTime', order: 'asc', label: 'Cook Time (Low to High)' },
  { field: 'cookTime', order: 'desc', label: 'Cook Time (High to Low)' },
];

interface SortDropdownProps {
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  sortField,
  sortOrder,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SORT_OPTIONS.find(
    (opt) => opt.field === sortField && opt.order === sortOrder
  ) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: SortOption) => {
    onSortChange(option.field, option.order);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Sort by: ${currentOption.label}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <line x1="4" y1="6" x2="16" y2="6" />
          <line x1="4" y1="12" x2="12" y2="12" />
          <line x1="4" y1="18" x2="8" y2="18" />
          <polyline points="15 15 18 18 21 15" />
          <line x1="18" y1="12" x2="18" y2="18" />
        </svg>
        <span className={styles.label}>{currentOption.label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <ul className={styles.menu} role="listbox" aria-label="Sort options">
          {SORT_OPTIONS.map((option) => (
            <li
              key={`${option.field}-${option.order}`}
              className={`${styles.option} ${
                option.field === sortField && option.order === sortOrder
                  ? styles.optionActive
                  : ''
              }`}
              role="option"
              aria-selected={option.field === sortField && option.order === sortOrder}
              onClick={() => handleSelect(option)}
            >
              {option.label}
              {option.field === sortField && option.order === sortOrder && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.checkIcon}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};