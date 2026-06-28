import { getDb } from './db';
import type { LibraryEntry } from '@/interfaces';

const STORE = 'library';

export async function saveToLibrary(entry: LibraryEntry): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, entry, entry.id);
  } catch {
    // non-fatal
  }
}

export async function getLibrary(): Promise<LibraryEntry[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll(STORE)) as LibraryEntry[];
    return all.sort((a, b) => b.lastRead - a.lastRead);
  } catch {
    return [];
  }
}

export async function removeFromLibrary(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE, id);
  } catch {
    // non-fatal
  }
}

export async function updateLibraryProgress(
  id: string,
  page: number,
  total: number,
): Promise<void> {
  try {
    const db = await getDb();
    const existing = (await db.get(STORE, id)) as LibraryEntry | undefined;
    if (!existing) return;
    await db.put(
      STORE,
      {
        ...existing,
        lastPage: page,
        progressPct: total > 0 ? Math.min(100, Math.round((page / total) * 100)) : 0,
        lastRead: Date.now(),
      },
      id,
    );
  } catch {
    // non-fatal
  }
}
