import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tag } from '../../types/contact';
import { tagApi } from '../../services/tagApi';
import { TagPill } from '../ui/TagPill';
import styles from './TagInput.module.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add a tag...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when input changes
  const fetchSuggestions = useCallback(async (search: string) => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await tagApi.getUserTags(search);
      // Filter out tags that are already selected
      const filteredTags = response.tags.filter(
        (tag) => !tags.some((t) => t.toLowerCase() === tag.name.toLowerCase())
      );
      setSuggestions(filteredTags);
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [tags]);

  // Debounce the fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim()) {
        fetchSuggestions(inputValue);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists (case-insensitive)
    if (tags.some((t) => t.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    onChange([...tags, trimmedName]);
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Handle comma-separated input
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.forEach((part, index) => {
        if (index < parts.length - 1 && part.trim()) {
          addTag(part);
        }
      });
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(value);
    }
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (tag: Tag) => {
    addTag(tag.name);
  };

  return (
    <div className={styles.container}>
      <div className={styles.tagsWrapper}>
        {tags.map((tag, index) => (
          <TagPill
            key={`${tag}-${index}`}
            name={tag}
            size="md"
            onRemove={() => removeTag(index)}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className={styles.input}
          aria-label="Add tag"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div ref={suggestionsRef} className={styles.suggestions}>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            suggestions.map((tag, index) => (
              <button
                key={tag.id}
                type="button"
                className={`${styles.suggestion} ${
                  index === selectedIndex ? styles.selected : ''
                }`}
                onClick={() => handleSuggestionClick(tag)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {tag.name}
              </button>
            ))
          )}
        </div>
      )}

      {inputValue.trim() &&
        !suggestions.some(
          (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
        ) &&
        showSuggestions && (
          <div className={styles.createHint}>
            Press Enter to create "{inputValue.trim()}"
          </div>
        )}
    </div>
  );
};

export default TagInput;
