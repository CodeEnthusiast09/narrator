import { useRef, useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

interface Props {
  onFile: (file: File) => void;
  error: string | null;
}

export function BookPicker({ onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { canInstall, install, dismiss } = useInstallPrompt();

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type === 'application/pdf') onFile(file);
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-canvas px-wrapper-md gap-8"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-col items-center gap-3 select-none">
        <svg
          className="w-16 h-16 text-accent opacity-90"
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

      <div
        className={[
          'w-full max-w-sm rounded-2xl border-2 border-dashed p-10',
          'flex flex-col items-center gap-4 transition-colors duration-150 cursor-pointer',
          dragging ? 'border-accent bg-accent/10' : 'border-border bg-surface',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <svg
          className="w-10 h-10 text-muted"
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
          <p className="text-fg font-medium">Open a PDF</p>
          <p className="text-muted text-sm mt-1">tap to browse or drop here</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
      )}

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
            <p className="text-fg text-sm flex-1 leading-snug">
              Install for a better experience
            </p>
            <button
              onClick={install}
              className="text-accent text-sm font-semibold shrink-0"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="text-muted shrink-0"
            >
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
