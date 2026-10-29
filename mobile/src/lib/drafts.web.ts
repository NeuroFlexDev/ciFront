import type { Draft } from './drafts';
export type { Draft } from './drafts';
// A browser preview deliberately has no persistent credentials or learner data.
const memory = new Map<string, Draft>();
export const drafts = {
  async get(scope: string, id: string) {
    return memory.get(scope + ':' + id) || null;
  },
  async set(scope: string, id: string, value: Draft) {
    memory.set(scope + ':' + id, value);
  },
  async remove(scope: string, id: string) {
    memory.delete(scope + ':' + id);
  },
  async clear(scope: string) {
    for (const key of memory.keys()) if (key.startsWith(scope + ':')) memory.delete(key);
  },
};
