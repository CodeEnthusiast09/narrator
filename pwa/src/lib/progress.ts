import { openDB } from 'idb';
import type { Progress } from '@/interfaces';

const DB_NAME = 'narrator';
const STORE = 'progress';

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE);
    },
  });
}

export async function loadProgress(key: string): Promise<Progress | null> {
  try {
    const store = await db();
    return (await store.get(STORE, key)) ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(key: string, progress: Progress): Promise<void> {
  try {
    const store = await db();
    await store.put(STORE, progress, key);
  } catch {
    // non-fatal
  }
}

export async function getAllProgress(): Promise<Array<{ key: string; progress: Progress }>> {
  try {
    const store = await db();
    const keys = await store.getAllKeys(STORE);
    const entries = await Promise.all(
      keys.map(async (k) => ({
        key: String(k),
        progress: (await store.get(STORE, k)) as Progress,
      })),
    );
    return entries;
  } catch {
    return [];
  }
}
