import { getDb } from './db';
import type { Progress } from '@/interfaces';

const STORE = 'progress';

export async function loadProgress(key: string): Promise<Progress | null> {
  try {
    const db = await getDb();
    return (await db.get(STORE, key)) ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(key: string, progress: Progress): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, progress, key);
  } catch {
    // non-fatal
  }
}

export async function getAllProgress(): Promise<Array<{ key: string; progress: Progress }>> {
  try {
    const db = await getDb();
    const keys = await db.getAllKeys(STORE);
    const entries = await Promise.all(
      keys.map(async (k) => ({
        key: String(k),
        progress: (await db.get(STORE, k)) as Progress,
      })),
    );
    return entries;
  } catch {
    return [];
  }
}
