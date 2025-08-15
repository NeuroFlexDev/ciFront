// src/Components/AiHelperPage/Chat/AiChat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

import {
  Chat,
  Message,
  createChat,
  getChats,
  getMessages,
  sendMessage,
  getModels,
  changeChatModel,
  renameChat,
  deleteChat as apiDeleteChat,
} from '@/features/chat/api';

// Сервер может вернуть либо массив сообщений, либо объект с полем messages
type ChatResponse = Message[] | { messages: Message[] };

const AiChat: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChat, setEditingChat] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [input, setInput] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- helpers ---
  const loadMessages = useCallback(async (chatId: number) => {
    try {
      const msgs = await getMessages(chatId);
      setMessages(msgs);
    } catch (e) {
      console.error('Load messages error', e);
      setMessages([]);
    }
  }, []);

  const loadChatsAndInit = useCallback(async () => {
    try {
      const ms = await getModels().catch(() => []);
      setModels(ms);

      const data = await getChats();
      if (data.length === 0) {
        const c = await createChat('Новый чат');
        setChats([c]);
        setSelectedChatId(c.id);
        setCurrentModel(c.model || undefined);
        setMessages([]);
      } else {
        setChats(data);
        const first = data[0];
        setSelectedChatId(first.id);
        setCurrentModel(first.model || undefined);
        await loadMessages(first.id);
      }
    } catch (e) {
      console.error('Init error', e);
      setChats([]);
      setMessages([]);
    }
  }, [loadMessages]);

  // --- init ---
  useEffect(() => {
    loadChatsAndInit();
  }, [loadChatsAndInit]);

  // reload msgs on chat change
  useEffect(() => {
    if (selectedChatId == null) return;
    const chat = chats.find(ch => ch.id === selectedChatId);
    setCurrentModel(chat?.model || undefined);
    loadMessages(selectedChatId);
  }, [selectedChatId, chats, loadMessages]);

  // автоскролл вниз
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- handlers ---
  const handleAddChat = async () => {
    try {
      const newChat = await createChat('Новый чат');
      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      setCurrentModel(newChat.model || undefined);
      setMessages([]);
    } catch (e) {
      console.error('Create chat error', e);
    }
  };

  const handleDeleteChat = async (id: number) => {
    try {
      await apiDeleteChat(id);
    } catch {
      // ignore API ошибки — всё равно удалим локально
    }
    setChats(prev => prev.filter(c => c.id !== id));
    if (selectedChatId === id) {
      const next = chats.find(c => c.id !== id)?.id ?? null;
      setSelectedChatId(next);
      if (next) await loadMessages(next);
      else setMessages([]);
    }
  };

  const handleRename = (chat: Chat) => {
    setEditingChat(chat.id);
    setNewName(chat.name);
  };

  const saveName = async (id: number) => {
    try {
      if (newName.trim()) {
        await renameChat(id, newName.trim());
        setChats(cs => cs.map(c => (c.id === id ? { ...c, name: newName.trim() } : c)));
      }
    } catch (e) {
      console.error('Rename chat error', e);
    } finally {
      setEditingChat(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) console.log('Выбран файл:', file);
  };

  const handleSend = async () => {
    if (!input.trim() || selectedChatId == null) return;
    const toSend = input.trim();
    setInput('');

    const userMsg: Message = { id: Date.now(), author: 'user', text: toSend };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const resp = (await sendMessage(
        selectedChatId,
        toSend,
        currentModel,
      )) as ChatResponse;

      const newMsgs = Array.isArray(resp) ? resp : resp.messages;
      if (Array.isArray(newMsgs)) {
        // Если бэкенд вернул только новые сообщения — добавим их,
        // если вернул всю историю — просто заменим.
        const hasOnlyNew =
          newMsgs.length > 0 && messages.some(m => m.id === newMsgs[0]?.id) === false;

        setMessages(prev =>
          hasOnlyNew ? [...prev.filter(m => m.id !== userMsg.id), ...newMsgs] : newMsgs,
        );
      } else {
        await loadMessages(selectedChatId);
      }
    } catch (e) {
      console.error('Send error', e);
      alert('Не удалось отправить сообщение');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleModelChange = async (m: string) => {
    const value = m || undefined;
    setCurrentModel(value);
    if (selectedChatId != null) {
      try {
        await changeChatModel(selectedChatId, m);
        setChats(cs =>
          cs.map(c => (c.id === selectedChatId ? { ...c, model: value } : c)),
        );
      } catch (e) {
        console.error('Change model error', e);
      }
    }
  };

  // --- render ---
  return (
    <div className={styles.container}>
      <main className={styles.chatWindow}>
        <div className={styles.modelBar}>
          <label>Модель:</label>
          <select value={currentModel || ''} onChange={e => handleModelChange(e.target.value)}>
            <option value="">(по умолчанию)</option>
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div ref={scrollRef} className={styles.messages}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={msg.author === 'user' ? styles.userMsg : styles.botMsg}
            >
              {msg.author === 'user' && <img src={userIcon} alt="" />}
              {msg.author === 'bot' && <img src={botIcon} alt="" />}
              {msg.text}
            </div>
          ))}
          {sending && (
            <div className={styles.botMsg}>
              <img src={botIcon} alt="" />
              <em>Модель думает…</em>
            </div>
          )}
        </div>

        <div className={styles.inputBar}>
          <button onClick={() => fileInputRef.current?.click()}>
            <img src={addDocument} alt="" />
          </button>
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
          <button onClick={handleSend} disabled={sending}>
            <img src={sendIcon} alt="Отправить" />
          </button>
        </div>
      </main>

      <aside className={styles.sidebar}>
        <div className={styles.searchBar}>
          <button
            onClick={() => setIsSearchVisible(s => !s)}
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
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        )}

        <ul className={styles.chatList}>
          {filteredChats.map(chat => {
            const isActive = chat.id === selectedChatId;
            return (
              <li
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={isActive ? styles.activeChat : styles.disActiveChat}
              >
                {editingChat === chat.id ? (
                  <div className={styles.renameForm} onClick={e => e.stopPropagation()}>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName(chat.id)}
                    />
                    <button style={{ padding: '0 5px' }} onClick={() => saveName(chat.id)}>
                      <img src={saveicon} alt="Сохранить" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.chatItem}>
                    <div className={styles.chatTitle}>
                      <img src={isActive ? chatActive : chatIcon} alt="" />
                      <span className={styles.chatName}>{chat.name}</span>
                    </div>
                    <div className={styles.chatActions} onClick={e => e.stopPropagation()}>
                      <button
                        className={styles.iconBtn}
                        title="Переименовать"
                        onClick={() => handleRename(chat)}
                      >
                        <img src={isActive ? editActive : edit} alt="Переименовать" />
                      </button>
                      <button
                        className={styles.iconBtn}
                        title="Удалить"
                        onClick={() => handleDeleteChat(chat.id)}
                      >
                        <img src={isActive ? deleteActive : deleteIcon} alt="Удалить" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
};

export default AiChat;
