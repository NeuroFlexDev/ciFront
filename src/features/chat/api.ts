// src/features/chat/api.ts
import { api } from '@/shared/api';

export type Chat = {
  id: number;
  name: string;
  model?: string | null;
  engine?: string | null;
};

export type Message = {
  id: number;
  author: 'user' | 'bot' | 'assistant';
  text: string;
};

/** --------- MODELS ---------- */
export async function getModels(): Promise<string[]> {
  const { data } = await api.get('/chat/models');
  return data;
}

/** --------- CHATS ---------- */
export async function createChat(name = 'Новый чат', model?: string, engine?: string) {
  const { data } = await api.post('/chat/', { name, model, engine });
  return data as Chat;
}

export async function renameChat(id: number, name: string) {
  const { data } = await api.patch(`/chat/${id}`, { name });
  return data as Chat;
}

export async function changeChatModel(id: number, model: string, engine?: string) {
  const { data } = await api.patch(`/chat/${id}/model`, { model, engine });
  return data as Chat;
}

export async function deleteChat(id: number): Promise<void> {
  await api.delete(`/chat/${id}`);
}

export async function getChats() {
  const { data } = await api.get('/chat/');
  return data as Chat[];
}

/** --------- MESSAGES ---------- */
export async function getMessages(chatId: number) {
  const { data } = await api.get(`/chat/${chatId}/messages`);
  return data as Message[];
}

/**
 * Бэкенд может вернуть:
 *  1) массив сообщений
 *  2) объект вида { messages: Message[] }
 *  3) { answer: string, raw: unknown } — тогда перезагрузим историю
 */
export async function sendMessage(chatId: number, text: string, model?: string, engine?: string) {
  const payload: unknown = { chat_id: chatId, text };
  if (model) payload.model = model;
  if (engine) payload.engine = engine;

  const { data } = await api.post('/chat/send', payload);

  if (Array.isArray(data)) return data as Message[];
  if (Array.isArray(data?.messages)) return data.messages as Message[];

  // fallback: если вернули объект без списка — просто перегрузи историю
  const msgs = await getMessages(chatId);
  return msgs;
}
