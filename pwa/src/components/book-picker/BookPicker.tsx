import { useRef, useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useLibrary } from '@/hooks/useLibrary';
import { BookShelf } from '@/components/book-shelf';
import type { LibraryEntry } from '@/interfaces';

type FilePicker = (opts?: object) => Promise<FileSystemFileHandle[]>;

interface Props {
  onFile: (file: File, handle?: FileSystemFileHandle) => void;
  onLibraryEntry: (entry: LibraryEntry) => void;
  error: string | null;
}

export function BookPicker({ onFile, onLibraryEntry, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { canInstall, install, dismiss } = useInstallPrompt();
  const { entries, remove } = useLibrary();

  const openWithPicker = async () => {
    const w = window as unknown as { showOpenFilePicker?: FilePicker };

    // Synchronous fallback — must happen BEFORE any await so the gesture context is still alive.
    if (!w.showOpenFilePicker) {
      inputRef.current?.click();
      return;
    }

    try {
      const [handle] = await w.showOpenFilePicker({
        types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      onFile(file, handle);
    } catch (e) {
      // AbortError = user cancelled — do nothing.
      // Any other failure: the gesture is expired so we can't trigger the input here.
      if ((e as Error).name !== 'AbortError') {
        // Surface the error so the user knows to try again.
        console.warn('showOpenFilePicker failed:', e);
      }
    }
  };

  const handleLibraryEntry = (entry: LibraryEntry) => {
    if (entry.handle) {
      onLibraryEntry(entry);
    } else {
      openWithPicker();
    }
  };

  const hasShelf = entries.length > 0;

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-canvas px-wrapper-md gap-6"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 select-none">
        <svg
          className="w-14 h-14 text-accent opacity-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
          />
        </svg>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Narrator</h1>
        <p className="text-muted text-sm">Your personal PDF audiobook reader</p>
      </div>

      {/* Recent books shelf */}
      {hasShelf && (
        <div className="w-full">
          <BookShelf entries={entries} onOpen={handleLibraryEntry} onRemove={remove} />
        </div>
      )}

      {/* Open button / drop zone */}
      <div
        className={[
          'w-full max-w-sm rounded-2xl border-2 border-dashed p-8',
          'flex flex-col items-center gap-3 transition-colors duration-150 cursor-pointer',
          dragging ? 'border-accent bg-accent/10' : 'border-border bg-surface',
        ].join(' ')}
        onClick={openWithPicker}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file?.type === 'application/pdf') onFile(file);
        }}
      >
        <svg
          className="w-9 h-9 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <div className="text-center">
          <p className="text-fg font-medium text-sm">{hasShelf ? 'Open another PDF' : 'Open a PDF'}</p>
          <p className="text-muted text-xs mt-0.5">tap to browse or drop here</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
      )}

      {/* PWA install banner */}
      {canInstall && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
          <div className="flex items-center gap-3 bg-raised border border-border rounded-2xl px-4 py-3 shadow-lg">
            <svg
              className="w-5 h-5 text-accent shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <p className="text-fg text-sm flex-1 leading-snug">Install for a better experience</p>
            <button onClick={install} className="text-accent text-sm font-semibold shrink-0">
              Install
            </button>
            <button onClick={dismiss} aria-label="Dismiss" className="text-muted shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
