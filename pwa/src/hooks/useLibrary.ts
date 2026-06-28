import { useCallback, useEffect, useState } from 'react';
import { getLibrary, removeFromLibrary } from '@/lib/library';
import type { LibraryEntry } from '@/interfaces';

export function useLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setEntries(await getLibrary());
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const remove = useCallback(async (id: string) => {
    await removeFromLibrary(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, reload, remove };
}
