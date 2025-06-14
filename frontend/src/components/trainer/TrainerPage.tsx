import React, { useState } from 'react';
import TrainerChat from './TrainerChat';
import MetricsInput from './MetricsInput';
import { CreateDailyMetricsDTO, CreateDailyMacrosDTO } from '../../types/trainer';
import styles from './TrainerPage.module.css';

const TrainerPage: React.FC = () => {
  const [showMetricsInput, setShowMetricsInput] = useState(false);

  const handleMetricsUpdate = (metrics: CreateDailyMetricsDTO) => {
    console.log('Metrics updated:', metrics);
    // The metrics are already saved by the MetricsInput component
    // This callback can be used for additional UI updates if needed
  };

  const handleMacrosUpdate = (macros: CreateDailyMacrosDTO) => {
    console.log('Macros updated:', macros);
    // Similar to metrics, this would be used for additional UI updates
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          onClick={() => setShowMetricsInput(true)}
          className={styles.metricsButton}
        >
          📊 Log Daily Metrics
        </button>
      </div>

      <div className={styles.chatContainer}>
        <TrainerChat
          onMetricsUpdate={handleMetricsUpdate}
          onMacrosUpdate={handleMacrosUpdate}
        />
      </div>

      {showMetricsInput && (
        <MetricsInput
          onSubmit={handleMetricsUpdate}
          onClose={() => setShowMetricsInput(false)}
        />
      )}
    </div>
  );
};

export default TrainerPage;