import React, { useState } from 'react';
import { Button, IconButton } from '../ui/Button';
import styles from './MultiValueInput.module.css';

interface MultiValueItem {
  value: string;
  label: string;
  isPrimary: boolean;
}

interface MultiValueInputProps {
  items: MultiValueItem[];
  onChange: (items: MultiValueItem[]) => void;
  labels: readonly string[];
  placeholder: string;
  type?: 'email' | 'tel' | 'text';
  fieldName: string;
}

export const MultiValueInput: React.FC<MultiValueInputProps> = ({
  items,
  onChange,
  labels,
  placeholder,
  type = 'text',
  fieldName,
}) => {
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState(labels[0]);

  const handleAdd = () => {
    if (!newValue.trim()) return;

    const newItem: MultiValueItem = {
      value: newValue.trim(),
      label: newLabel,
      isPrimary: items.length === 0, // First item is primary by default
    };

    onChange([...items, newItem]);
    setNewValue('');
    setNewLabel(labels[0]);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // If we removed the primary, make the first remaining item primary
    if (items[index].isPrimary && newItems.length > 0) {
      newItems[0].isPrimary = true;
    }
    onChange(newItems);
  };

  const handleSetPrimary = (index: number) => {
    const newItems = items.map((item, i) => ({
      ...item,
      isPrimary: i === index,
    }));
    onChange(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.itemList}>
        {items.map((item, index) => (
          <div key={index} className={styles.item}>
            <span className={styles.itemValue}>{item.value}</span>
            <span className={styles.itemLabel}>({item.label})</span>
            {item.isPrimary && (
              <span className={styles.primaryBadge}>Primary</span>
            )}
            {!item.isPrimary && items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSetPrimary(index)}
                className={styles.setPrimaryButton}
              >
                Set Primary
              </Button>
            )}
            <IconButton
              icon={<span>&times;</span>}
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(index)}
              aria-label={`Remove ${fieldName}`}
              className={styles.removeButton}
            />
          </div>
        ))}
      </div>

      <div className={styles.addRow}>
        <input
          type={type}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input}
        />
        <select
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className={styles.labelSelect}
        >
          {labels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleAdd}
          disabled={!newValue.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
};

export default MultiValueInput;