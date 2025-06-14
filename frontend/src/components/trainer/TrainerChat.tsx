import React, { useState, useEffect, useRef } from 'react';
import { TrainerConversation, TrainerMessage, CreateDailyMetricsDTO, CreateDailyMacrosDTO } from '../../types/trainer';
import { trainerApi } from '../../services/trainerApi';
import styles from './TrainerChat.module.css';

interface TrainerChatProps {
  onMetricsUpdate?: (metrics: CreateDailyMetricsDTO) => void;
  onMacrosUpdate?: (macros: CreateDailyMacrosDTO) => void;
}

const TrainerChat: React.FC<TrainerChatProps> = ({ onMetricsUpdate, onMacrosUpdate }) => {
  const [conversation, setConversation] = useState<TrainerConversation | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      const conv = await trainerApi.getConversation();
      setConversation(conv);
      setError(null);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await trainerApi.sendMessage({
        message: message.trim()
      });

      setConversation(response.conversation);
      setTodaysPlan(response.todaysPlan);
      setMessage('');
      
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const formatMessageContent = (content: string) => {
    // Simple formatting for trainer messages
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading && !conversation) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🏋️ Lean-Bulk Coach</h2>
        {todaysPlan?.macroTargets && (
          <div className={styles.macroTargets}>
            <strong>Today's Targets:</strong> {todaysPlan.macroTargets.kcal_target} kcal | 
            {todaysPlan.macroTargets.protein_g}g P | 
            {todaysPlan.macroTargets.carb_g}g C | 
            {todaysPlan.macroTargets.fat_g}g F
          </div>
        )}
      </div>

      <div className={styles.messagesContainer}>
        {conversation?.messages && conversation.messages.length > 0 ? (
          conversation.messages.map((msg: TrainerMessage) => (
            <div
              key={msg.id}
              className={`${styles.message} ${
                msg.role === 'user' ? styles.userMessage : styles.trainerMessage
              }`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.sender}>
                  {msg.role === 'user' ? 'You' : 'Coach'}
                </span>
                <span className={styles.timestamp}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <div 
                className={styles.messageContent}
                dangerouslySetInnerHTML={{ 
                  __html: formatMessageContent(msg.content) 
                }}
              />
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>👋 Hey Danny! I'm your Lean-Bulk Coach.</p>
            <p>Send me your morning metrics to get started:</p>
            <ul>
              <li>Body weight (lb)</li>
              <li>Body fat %</li>
              <li>Sleep hours</li>
              <li>Fatigue level (1-5)</li>
              <li>Mood</li>
              <li>Back comfort (0-10)</li>
              <li>Training window</li>
            </ul>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className={styles.inputForm}>
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className={styles.messageInput}
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={styles.sendButton}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrainerChat;