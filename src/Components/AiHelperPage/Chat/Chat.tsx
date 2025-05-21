import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';
import sendIcon from '@/assets/icons/aiChat/sendIcon.svg';
import addDocument from '@/assets/icons/aiChat/addDocumentBtn.svg';
import searchInChat from '@/assets/icons/aiChat/searchInChat.svg';
import edit from '@/assets/icons/aiChat/edit.svg';
import deleteIcon from '@/assets/icons/aiChat/trash.svg';
import editActive from '@/assets/icons/aiChat/editActive.svg';
import deleteActive from '@/assets/icons/aiChat/trashActive.svg';
import chatIcon from '@/assets/icons/aiChat/history.svg';
import chatActive from '@/assets/icons/aiChat/historyActive.svg';
import saveicon from '@/assets/icons/aiChat/save.svg';
import userIcon from '@/assets/icons/aiChat/userRuslan.svg';
import botIcon from '@/assets/icons/aiChat/botAi.svg';

type Message = {
  id: number;
  author: 'user' | 'bot';
  text: string;
};

type Chat = {
  id: number;
  name: string;
  messages: Message[];
};

export const AiChat: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChat, setEditingChat] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [input, setInput] = useState('');
  const nextChatId = useRef(1);
  const nextMsgId = useRef(1);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs для таймеров и интервалов
  const timersRef = useRef<{ [key: string]: number }>({});
  const intervalsRef = useRef<{ [key: number]: number }>({});

  useEffect(() => {
    const initial: Chat = { id: nextChatId.current++, name: 'Новый чат', messages: [] };
    setChats([initial]);
    setSelectedChatId(initial.id);

    // Очистка таймеров и интервалов при размонтировании
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  // Фильтрация чатов
  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Создание нового чата
  const handleAddChat = () => {
    const newChat: Chat = { id: nextChatId.current++, name: 'Новый чат', messages: [] };
    setChats([...chats, newChat]);
    setSelectedChatId(newChat.id);
  };

  // Удаление чата
  const handleDeleteChat = (id: number) => {
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    if (selectedChatId === id) {
      setSelectedChatId(updated.length ? updated[0].id : null);
    }
  };

  // Редактирование названия чата
  const handleRename = (chat: Chat) => {
    setEditingChat(chat.id);
    setNewName(chat.name);
  };

  // Сохранение нового названия чата
  const saveName = (id: number) => {
    setChats(chats.map(c => c.id === id ? { ...c, name: newName } : c));
    setEditingChat(null);
  };

  // Обработка загрузки файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Выбранный файл:', file);
      // Здесь можно реализовать логику загрузки файла
    }
  };

  // Отправка сообщения
  const handleSend = () => {
    if (!input.trim() || selectedChatId == null) return;

    // Добавляем сообщение пользователя
    const userMsg: Message = { id: nextMsgId.current++, author: 'user', text: input.trim() };
    setChats(chats.map(c => 
      c.id === selectedChatId ? { ...c, messages: [...c.messages, userMsg] } : c
    ));
    setInput('');

    // Имитация задержки сервера (1 секунда)
    timersRef.current['thinking'] = window.setTimeout(() => {
      const botMsgId = nextMsgId.current++;
      const botMsg: Message = { id: botMsgId, author: 'bot', text: '...' };

      // Добавляем сообщение с троеточием
      setChats(chats => chats.map(chat => 
        chat.id === selectedChatId ? { 
          ...chat, 
          messages: [...chat.messages, botMsg] 
        } : chat
      ));

      // Запускаем анимацию печати через 1.5 секунды
      timersRef.current['typing'] = window.setTimeout(() => {
        const fullText = 'Я пока не подключен к серверу, поэтому не смогу тебе помочь, но в скором времени можешь рассчитывать на меня :)';
        let index = 0;

        intervalsRef.current[botMsgId] = window.setInterval(() => {
          if (index < fullText.length) {
            setChats(chats => chats.map(chat => 
              chat.id === selectedChatId ? {
                ...chat,
                messages: chat.messages.map(msg => 
                  msg.id === botMsgId ? { ...msg, text: fullText.slice(0, index + 1) } : msg
                )
              } : chat
            ));
            index++;
          } else {
            clearInterval(intervalsRef.current[botMsgId]);
            delete intervalsRef.current[botMsgId];
          }
        }, 50); // Скорость печати (50 мс на символ)
      }, 1500); // Длительность анимации троеточия
    }, 1000); // Задержка перед ответом сервера
  };

  const currentChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className={styles.container}>
      <main className={styles.chatWindow}>
        <div className={styles.messages}>
          {currentChat?.messages.map(msg => (
            <div
              key={msg.id}
              className={`${msg.author === 'user' ? styles.userMsg : styles.botMsg} ${msg.text === '...' ? styles.dots : ''}`}
            >
              {msg.author === 'user' && <img src={userIcon} alt="" />}
              {msg.author === 'bot' && <img src={botIcon} alt="" />}
              {msg.text !== '...' && msg.text}
            </div>
          ))}
        </div>
        <div className={styles.inputBar}>
          <button onClick={() => fileInputRef.current?.click()}><img src={addDocument} alt="" /></button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Введите сообщение..."
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend}><img src={sendIcon} alt="Отправить" /></button>
        </div>
      </main>

      <aside className={styles.sidebar}>
        <div className={styles.searchBar}>
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            aria-label="Показать/скрыть поиск"
            className={styles.searchButton}
          >
            <img src={searchInChat} alt="" />
          </button>

          <button className={styles.newChatBtn} onClick={handleAddChat}>
            <p className={styles.newChatText}>+ Новый чат</p>
          </button>
        </div>

        {isSearchVisible && (
          <input
            className={styles.search}
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        )}

        <ul className={styles.chatList}>
          {filteredChats.map(chat => (
            <li
              onClick={() => setSelectedChatId(chat.id)}
              key={chat.id}
              className={chat.id === selectedChatId ? styles.activeChat : styles.disActiveChat}
            >
              {editingChat === chat.id ? (
                <div className={styles.renameForm}>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                  <button style={{ padding: '0 5px' }} onClick={() => saveName(chat.id)}>
                    <img src={saveicon} alt="Сохранить" />
                  </button>
                </div>
              ) : (
                <div className={styles.chatItem}>
                  <div className={styles.chatInfo}>
                    <img src={chat.id === selectedChatId ? chatActive : chatIcon} alt="" />
                    <span>
                      {chat.name.length > 23 
                        ? `${chat.name.slice(0, 20)}...` 
                        : chat.name
                      }
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <button onClick={() => handleRename(chat)}>
                      <img src={chat.id === selectedChatId ? editActive : edit} alt="Ред." />
                    </button>
                    <button onClick={() => handleDeleteChat(chat.id)}>
                      <img src={chat.id === selectedChatId ? deleteActive : deleteIcon} alt="Удалить" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

export default AiChat;