import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { secure } from './secure';
import type { Answer } from './types';
export type Draft = { answer: Answer; revision: number; attempt: number; submission_key: string };
const preview = new Map<string, Draft>();
let database: Promise<SQLite.SQLiteDatabase> | null = null;
async function db() {
  if (!database)
    database = (async () => {
      let key = await secure.get('draft-encryption-key');
      if (!key) {
        key = Array.from(await Crypto.getRandomBytesAsync(32), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
        await secure.set('draft-encryption-key', key);
      }
      if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Не удалось открыть защищённые черновики');
      const connection = await SQLite.openDatabaseAsync('lernium-drafts.db');
      if (!(await connection.getFirstAsync('PRAGMA cipher_version'))) {
        await connection.closeAsync();
        throw new Error(
          'Для защищённых черновиков нужна сборка Lernium. Expo Go не поддерживается.',
        );
      }
      await connection.execAsync(
        "PRAGMA key = '" +
          key +
          "'; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS drafts (scope TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope,id));",
      );
      return connection;
    })().catch((error) => {
      database = null;
      throw error;
    });
  return database;
}
export const drafts = {
  async get(scope: string, id: string): Promise<Draft | null> {
    if (Platform.OS === 'web') return preview.get(scope + ':' + id) || null;
    const row = await (
      await db()
    ).getFirstAsync<{ payload: string }>(
      'SELECT payload FROM drafts WHERE scope=? AND id=?',
      scope,
      id,
    );
    return row ? JSON.parse(row.payload) : null;
  },
  async set(scope: string, id: string, draft: Draft) {
    if (Platform.OS === 'web') {
      preview.set(scope + ':' + id, draft);
      return;
    }
    await (
      await db()
    ).runAsync(
      'INSERT INTO drafts(scope,id,payload) VALUES(?,?,?) ON CONFLICT(scope,id) DO UPDATE SET payload=excluded.payload',
      scope,
      id,
      JSON.stringify(draft),
    );
  },
  async remove(scope: string, id: string) {
    if (Platform.OS === 'web') {
      preview.delete(scope + ':' + id);
      return;
    }
    await (await db()).runAsync('DELETE FROM drafts WHERE scope=? AND id=?', scope, id);
  },
  async clear(scope: string) {
    if (Platform.OS === 'web') {
      for (const key of preview.keys()) if (key.startsWith(scope + ':')) preview.delete(key);
      return;
    }
    await (await db()).runAsync('DELETE FROM drafts WHERE scope=?', scope);
  },
};
