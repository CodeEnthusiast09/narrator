import { useCallback, useEffect, useRef, useState } from 'react';
import { buildChapterMap } from '@/lib/chapter';
import { extractPages } from '@/lib/pdf';
import { saveToLibrary, updateLibraryProgress } from '@/lib/library';
import { loadProgress, saveProgress } from '@/lib/progress';
import { buildPageSentences, CHAPTER_PAUSE } from '@/lib/sentences';
import { detectCandidates } from '@/lib/skip';
import { useTTS } from './useTTS';
import type { Book, LibraryEntry, PlayerStatus, Progress } from '@/interfaces';

export interface PlayerControls {
  status: PlayerStatus;
  book: Book | null;
  currentPage: number;
  currentSentences: string[];
  error: string | null;
  frontMatterCandidates: number[];
  frontMatterSkip: Set<number>;
  savedProgress: Progress | null;
  tts: ReturnType<typeof useTTS>;
  openFile: (file: File, handle?: FileSystemFileHandle) => void;
  openLibraryEntry: (entry: LibraryEntry) => void;
  toggleFrontMatterSkip: (page: number) => void;
  confirmFrontMatter: () => void;
  skipAllFrontMatter: () => void;
  keepAllFrontMatter: () => void;
  confirmResume: (resume: boolean) => void;
  pause: () => void;
  resume: () => void;
  nextPage: () => void;
  prevPage: () => void;
  close: () => void;
}

function pageSentences(book: Book, page: number): string[] {
  const chunks = buildPageSentences(book.pages[page] ?? '');
  if (page in book.chapterMap && chunks.length > 0) {
    return [chunks[0], CHAPTER_PAUSE, ...chunks.slice(1)];
  }
  return chunks;
}

function firstReadablePage(book: Book): number {
  let p = 0;
  while (p < book.pages.length && book.skipPages.has(p)) p++;
  return p;
}

export function usePlayer(): PlayerControls {
  const tts = useTTS();

  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSentences, setCurrentSentences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [frontMatterCandidates, setFrontMatterCandidates] = useState<number[]>([]);
  const [frontMatterSkip, setFrontMatterSkip] = useState<Set<number>>(new Set());
  const [savedProgress, setSavedProgress] = useState<Progress | null>(null);

  // Refs so callbacks always have current values without re-creating
  const bookRef = useRef<Book | null>(null);
  const currentPageRef = useRef(0);
  const ttsRef = useRef(tts);

  useEffect(() => { bookRef.current = book; }, [book]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { ttsRef.current = tts; }, [tts]);

  // Stable callback for when a page finishes playing
  const onPageComplete = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;

    let next = currentPageRef.current + 1;
    while (next < b.pages.length && b.skipPages.has(next)) next++;

    if (next < b.pages.length) {
      const sents = pageSentences(b, next);
      currentPageRef.current = next;
      setCurrentPage(next);
      setCurrentSentences(sents);
      void saveProgress(b.key, { page: next, sentence: 0, total: b.pages.length, title: b.title });
      void updateLibraryProgress(b.key, next, b.pages.length);
      ttsRef.current.speak(sents, 0, onPageComplete);
    } else {
      setStatus('done');
    }
  }, []); // stable — uses refs only

  const startReading = useCallback(
    (b: Book, page: number, sentence: number, announce?: string) => {
      const sents = pageSentences(b, page);
      const full = announce ? [announce, CHAPTER_PAUSE, ...sents] : sents;
      currentPageRef.current = page;
      setCurrentPage(page);
      setCurrentSentences(full);
      setStatus('reading');
      ttsRef.current.speak(full, sentence, onPageComplete);
    },
    [onPageComplete],
  );

  const openFile = useCallback(
    async (file: File, handle?: FileSystemFileHandle) => {
      // Chrome blocks speechSynthesis.speak() after an await (gesture context expires).
      // Calling speak() now (still in the click handler) unlocks it for the session.
      const primer = new SpeechSynthesisUtterance(' ');
      primer.volume = 0;
      primer.rate = 10;
      speechSynthesis.speak(primer);

      setStatus('loading');
      setError(null);
      ttsRef.current.stop();

      try {
        const { title, pages } = await extractPages(file);
        const chapterMap = buildChapterMap(pages);
        const key = `${file.name}::${file.size}`;

        const newBook: Book = {
          key,
          title,
          pages,
          skipPages: new Set<number>(),
          chapterMap,
        };

        void saveToLibrary({
          id: key,
          title,
          pageCount: pages.length,
          lastPage: 0,
          progressPct: 0,
          lastRead: Date.now(),
          handle,
        });

        const candidates = detectCandidates(pages);
        const progress = await loadProgress(key);

        bookRef.current = newBook;
        setBook(newBook);
        setFrontMatterCandidates(candidates);
        setFrontMatterSkip(new Set(candidates));
        setSavedProgress(progress);

        if (candidates.length > 0) {
          setStatus('front-matter');
        } else if (progress && progress.page >= firstReadablePage(newBook)) {
          setStatus('resume');
        } else {
          const first = firstReadablePage(newBook);
          startReading(newBook, first, 0, `Now reading: ${newBook.title}.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('idle');
      }
    },
    [startReading],
  );

  const openLibraryEntry = useCallback(
    async (entry: LibraryEntry) => {
      if (!entry.handle) return;
      try {
        const file = await entry.handle.getFile();
        openFile(file, entry.handle);
      } catch {
        setError('Could not reopen this file. Please browse for it manually.');
        setStatus('idle');
      }
    },
    [openFile],
  );

  const applyFrontMatter = useCallback(
    (skipSet: Set<number>, b: Book, progress: Progress | null) => {
      const updated: Book = { ...b, skipPages: skipSet };
      bookRef.current = updated;
      setBook(updated);

      const first = firstReadablePage(updated);

      if (progress && progress.page >= first) {
        setSavedProgress(progress);
        setStatus('resume');
      } else {
        startReading(updated, first, 0, `Now reading: ${updated.title}.`);
      }
    },
    [startReading],
  );

  const toggleFrontMatterSkip = useCallback((page: number) => {
    setFrontMatterSkip((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  }, []);

  const confirmFrontMatter = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;
    applyFrontMatter(frontMatterSkip, b, savedProgress);
  }, [frontMatterSkip, savedProgress, applyFrontMatter]);

  const skipAllFrontMatter = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;
    const allSkip = new Set(frontMatterCandidates);
    setFrontMatterSkip(allSkip);
    applyFrontMatter(allSkip, b, savedProgress);
  }, [frontMatterCandidates, savedProgress, applyFrontMatter]);

  const keepAllFrontMatter = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;
    applyFrontMatter(new Set(), b, savedProgress);
  }, [savedProgress, applyFrontMatter]);

  const confirmResume = useCallback(
    (shouldResume: boolean) => {
      const b = bookRef.current;
      const progress = savedProgress;
      if (!b) return;

      if (shouldResume && progress) {
        startReading(b, progress.page, progress.sentence, `Continuing ${b.title}.`);
      } else {
        startReading(b, firstReadablePage(b), 0, `Now reading: ${b.title}.`);
      }
    },
    [savedProgress, startReading],
  );

  const pause = useCallback(() => {
    ttsRef.current.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    ttsRef.current.resume();
    setStatus('reading');
  }, []);

  const nextPage = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;
    let next = currentPageRef.current + 1;
    while (next < b.pages.length && b.skipPages.has(next)) next++;
    if (next < b.pages.length) {
      const sents = pageSentences(b, next);
      currentPageRef.current = next;
      setCurrentPage(next);
      setCurrentSentences(sents);
      setStatus('reading');
      void saveProgress(b.key, { page: next, sentence: 0, total: b.pages.length, title: b.title });
      void updateLibraryProgress(b.key, next, b.pages.length);
      ttsRef.current.speak(sents, 0, onPageComplete);
    } else {
      ttsRef.current.stop();
      setStatus('done');
    }
  }, [onPageComplete]);

  const prevPage = useCallback(() => {
    const b = bookRef.current;
    if (!b) return;
    let prev = currentPageRef.current - 1;
    while (prev >= 0 && b.skipPages.has(prev)) prev--;
    if (prev >= 0) {
      const sents = pageSentences(b, prev);
      currentPageRef.current = prev;
      setCurrentPage(prev);
      setCurrentSentences(sents);
      setStatus('reading');
      void saveProgress(b.key, { page: prev, sentence: 0, total: b.pages.length, title: b.title });
      void updateLibraryProgress(b.key, prev, b.pages.length);
      ttsRef.current.speak(sents, 0, onPageComplete);
    }
  }, [onPageComplete]);

  const close = useCallback(() => {
    ttsRef.current.stop();
    const b = bookRef.current;
    if (b) {
      void saveProgress(b.key, {
        page: currentPageRef.current,
        sentence: ttsRef.current.pauseIdx,
        total: b.pages.length,
        title: b.title,
      });
    }
    setStatus('idle');
    setBook(null);
    bookRef.current = null;
    setCurrentPage(0);
    currentPageRef.current = 0;
    setError(null);
  }, []);

  // Save progress when app goes to background on mobile
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const b = bookRef.current;
        if (b && (status === 'reading' || status === 'paused')) {
          void saveProgress(b.key, {
            page: currentPageRef.current,
            sentence: ttsRef.current.pauseIdx,
            total: b.pages.length,
            title: b.title,
          });
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [status]);

  return {
    status,
    book,
    currentPage,
    currentSentences,
    error,
    frontMatterCandidates,
    frontMatterSkip,
    savedProgress,
    tts,
    openFile,
    openLibraryEntry,
    toggleFrontMatterSkip,
    confirmFrontMatter,
    skipAllFrontMatter,
    keepAllFrontMatter,
    confirmResume,
    pause,
    resume,
    nextPage,
    prevPage,
    close,
  };
}
