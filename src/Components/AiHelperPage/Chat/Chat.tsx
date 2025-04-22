import { useState } from 'react';
import styles from './styles.module.css';
import sendIcon from '@/assets/icons/common/sendIcon.svg';

interface CourseStructure {
  title: string;
  topics: string[];
}

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  course?: CourseStructure;
}

const AiChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      isBot: false,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Имитация запроса к API
    try {
      // Здесь должен быть реальный запрос к API
      const mockResponse: CourseStructure = {
        title: `Курс по "${inputMessage}"`,
        topics: [
          'Введение в тему',
          'Основные концепции',
          'Практические примеры',
          'Продвинутые техники',
          'Итоговый проект',
        ],
      };

      const botMessage: Message = {
        id: Date.now() + 1,
        text: 'Вот структура вашего курса:',
        isBot: true,
        course: mockResponse,
      };

      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Ошибка:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.map(message => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.isBot ? styles.botMessage : styles.userMessage
            }`}
          >
            <div className={styles.messageContent}>
              <p>{message.text}</p>
              {message.course && (
                <div className={styles.courseCard}>
                  <h3>{message.course.title}</h3>
                  <ul>
                    {message.course.topics.map((topic, index) => (
                      <li key={index}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <div className={styles.messageContent}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          placeholder="Введите сообщение..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          <img src={sendIcon} alt="Отправить" />
        </button>
      </form>
    </div>
  );
};

export default AiChat;