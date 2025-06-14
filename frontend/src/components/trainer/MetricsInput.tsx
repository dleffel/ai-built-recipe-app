import React, { useState, useEffect } from 'react';
import { CreateDailyMetricsDTO, DailyMetrics } from '../../types/trainer';
import { trainerApi } from '../../services/trainerApi';
import styles from './MetricsInput.module.css';

interface MetricsInputProps {
  onSubmit: (metrics: CreateDailyMetricsDTO) => void;
  onClose: () => void;
  date?: string;
}

const MetricsInput: React.FC<MetricsInputProps> = ({ onSubmit, onClose, date }) => {
  const [metrics, setMetrics] = useState<CreateDailyMetricsDTO>({
    date: date || trainerApi.getTodayDate(),
    bodyWeight: undefined,
    bodyFatPct: undefined,
    sleepHours: undefined,
    fatigueLevel: undefined,
    mood: '',
    backComfort: undefined,
    trainingWindow: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      loadExistingMetrics(date);
    }
  }, [date]);

  const loadExistingMetrics = async (dateStr: string) => {
    try {
      const existingMetrics = await trainerApi.getMetrics(dateStr);
      if (existingMetrics) {
        setMetrics({
          date: dateStr,
          bodyWeight: existingMetrics.bodyWeight,
          bodyFatPct: existingMetrics.bodyFatPct,
          sleepHours: existingMetrics.sleepHours,
          fatigueLevel: existingMetrics.fatigueLevel,
          mood: existingMetrics.mood || '',
          backComfort: existingMetrics.backComfort,
          trainingWindow: existingMetrics.trainingWindow || ''
        });
      }
    } catch (err) {
      console.error('Error loading existing metrics:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await trainerApi.updateMetrics(metrics);
      onSubmit(metrics);
      onClose();
    } catch (err) {
      console.error('Error saving metrics:', err);
      setError('Failed to save metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateDailyMetricsDTO, value: any) => {
    setMetrics(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Daily Metrics</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Date</label>
            <input
              type="date"
              value={metrics.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Body Weight (lb)</label>
              <input
                type="number"
                step="0.1"
                value={metrics.bodyWeight || ''}
                onChange={(e) => handleInputChange('bodyWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="180.5"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={metrics.bodyFatPct || ''}
                onChange={(e) => handleInputChange('bodyFatPct', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="12.5"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Sleep (hours)</label>
              <input
                type="number"
                step="0.5"
                value={metrics.sleepHours || ''}
                onChange={(e) => handleInputChange('sleepHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="8.0"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Fatigue (1-5)</label>
              <select
                value={metrics.fatigueLevel || ''}
                onChange={(e) => handleInputChange('fatigueLevel', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select...</option>
                <option value="1">1 - Very Low</option>
                <option value="2">2 - Low</option>
                <option value="3">3 - Moderate</option>
                <option value="4">4 - High</option>
                <option value="5">5 - Very High</option>
              </select>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Mood</label>
            <input
              type="text"
              value={metrics.mood || ''}
              onChange={(e) => handleInputChange('mood', e.target.value)}
              placeholder="Great, tired, stressed, etc."
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Back Comfort (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={metrics.backComfort || ''}
                onChange={(e) => handleInputChange('backComfort', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="8"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Training Window</label>
              <select
                value={metrics.trainingWindow || ''}
                onChange={(e) => handleInputChange('trainingWindow', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="AM">Morning</option>
                <option value="PM">Evening</option>
                <option value="AM+PM">Both</option>
                <option value="None">Rest Day</option>
              </select>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
              {isLoading ? 'Saving...' : 'Save Metrics'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetricsInput;