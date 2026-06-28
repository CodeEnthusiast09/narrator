import { useEffect, useRef, useState } from 'react';
import type { PlayerControls } from '@/hooks/usePlayer';
import { CHAPTER_PAUSE, PARA_PAUSE } from '@/lib/sentences';

interface Props {
  player: PlayerControls;
}

const FONT_SIZES = ['0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem'];
const FONT_LABELS = ['xs', 'S', 'M', 'L', 'XL'];
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const PITCHES = [0.5, 0.75, 1.0, 1.25, 1.5];
const SLEEP_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Off', value: null },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '60m', value: 60 },
];

export function Player({ player }: Props) {
  const {
    status, book, currentPage, currentSentences, tts,
    frontMatterCandidates, frontMatterSkip,
    savedProgress,
    toggleFrontMatterSkip, confirmFrontMatter, skipAllFrontMatter, keepAllFrontMatter,
    confirmResume,
    seekTo, sleepTimer,
    pause, resume, nextPage, prevPage, close,
  } = player;

  const [showSettings, setShowSettings] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(() =>
    Number(localStorage.getItem('narrator_font_size') ?? '1'),
  );
  const sentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  useEffect(() => {
    localStorage.setItem('narrator_font_size', String(fontSizeIdx));
  }, [fontSizeIdx]);

  // Auto-scroll active sentence into view
  useEffect(() => {
    const el = sentenceRefs.current.get(tts.pauseIdx);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tts.pauseIdx]);

  if (!book) return null;

  const total = book.pages.length;
  const pct = ((currentPage + 1) / total) * 100;
  const chapter = (() => {
    for (let p = currentPage; p >= 0; p--) {
      if (p in book.chapterMap) return book.chapterMap[p];
    }
    return null;
  })();

  const isPlaying = status === 'reading';
  const isDone = status === 'done';
  const isLoading = status === 'loading';
  const canSeek = status === 'reading' || status === 'paused';
  const showOverlay = status === 'front-matter' || status === 'resume' || isDone || isLoading;

  return (
    <div className="flex flex-col h-full bg-canvas select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          className="p-2 -ml-2 text-muted active:text-fg transition-colors"
          onClick={close}
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>

        <div className="flex-1 text-center px-3 overflow-hidden">
          <p className="text-xs text-muted truncate uppercase tracking-widest">Narrator</p>
          <p className="text-sm font-semibold text-fg truncate leading-tight">
            {chapter ? `${book.title} › ${chapter}` : book.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sleep timer indicator */}
          {sleepTimer.minutesLeft !== null && (
            <span className="text-xs text-accent tabular-nums">
              {sleepTimer.minutesLeft}m
            </span>
          )}
          <span className="text-xs text-muted tabular-nums whitespace-nowrap">
            {currentPage + 1}/{total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Page text — sentence-level highlighting, tap-to-seek */}
      <div className="flex-1 overflow-y-auto px-wrapper-md py-5">
        <p className="leading-relaxed break-words" style={{ fontSize: FONT_SIZES[fontSizeIdx] }}>
          {currentSentences.map((s, i) => {
            if (s === CHAPTER_PAUSE) return <span key={i} className="block h-5" />;
            if (s === PARA_PAUSE) return <span key={i} className="block h-3" />;
            const isActive = isPlaying && i === tts.pauseIdx;
            return (
              <span
                key={i}
                ref={(el) => {
                  if (el) sentenceRefs.current.set(i, el);
                  else sentenceRefs.current.delete(i);
                }}
                className={[
                  'transition-colors duration-300',
                  canSeek ? 'cursor-pointer' : '',
                  isActive ? 'text-accent' : 'text-fg/70',
                ].join(' ')}
                onClick={() => canSeek && seekTo(i)}
              >
                {s}{' '}
              </span>
            );
          })}
        </p>
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-border bg-surface px-4 pb-6 pt-3"
           style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <button
            className="p-3 text-muted active:text-fg transition-colors disabled:opacity-30"
            onClick={prevPage}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z" />
            </svg>
          </button>

          <button
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center active:bg-accent/80 transition-colors shadow-lg"
            onClick={isPlaying ? pause : resume}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-7 h-7 text-canvas" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7 0a.75.75 0 0 1 .75-.75H16a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-canvas ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            className="p-3 text-muted active:text-fg transition-colors disabled:opacity-30"
            onClick={nextPage}
            disabled={isDone}
            aria-label="Next page"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.347 12 7.25 12 8.69v2.34L5.055 7.06Z" />
            </svg>
          </button>
        </div>

        {/* Speed + Settings row */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={[
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  tts.speed === s ? 'bg-accent text-canvas' : 'text-muted active:text-fg',
                ].join(' ')}
                onClick={() => tts.setSpeed(s)}
              >
                {s === 1.0 ? '1x' : `${s}x`}
              </button>
            ))}
          </div>

          <button
            className="p-2 text-muted active:text-fg transition-colors"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Settings"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowSettings(false)}>
          <div
            className="w-full bg-surface rounded-t-2xl border-t border-border p-6 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-fg font-semibold text-base">Settings</h2>
              <button className="text-muted" onClick={() => setShowSettings(false)}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Font size */}
            <p className="text-muted text-xs uppercase tracking-widest mb-3">Text size</p>
            <div className="flex items-center gap-2 mb-6">
              <button
                className="w-10 h-10 rounded-xl border border-border text-fg text-base font-bold active:bg-raised transition-colors disabled:opacity-30"
                onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1))}
                disabled={fontSizeIdx === 0}
              >
                A-
              </button>
              <div className="flex-1 flex gap-1">
                {FONT_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    className={[
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                      fontSizeIdx === idx ? 'bg-accent text-canvas' : 'text-muted active:bg-raised',
                    ].join(' ')}
                    onClick={() => setFontSizeIdx(idx)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="w-10 h-10 rounded-xl border border-border text-fg text-base font-bold active:bg-raised transition-colors disabled:opacity-30"
                onClick={() => setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
                disabled={fontSizeIdx === FONT_SIZES.length - 1}
              >
                A+
              </button>
            </div>

            {/* Pitch */}
            <p className="text-muted text-xs uppercase tracking-widest mb-3">Pitch</p>
            <div className="flex gap-1 mb-6">
              {PITCHES.map((p) => (
                <button
                  key={p}
                  className={[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                    tts.pitch === p ? 'bg-accent text-canvas' : 'text-muted active:bg-raised',
                  ].join(' ')}
                  onClick={() => tts.setPitch(p)}
                >
                  {p === 1.0 ? '1×' : `${p}×`}
                </button>
              ))}
            </div>

            {/* Sleep timer */}
            <p className="text-muted text-xs uppercase tracking-widest mb-3">
              Sleep timer{sleepTimer.minutesLeft !== null ? ` — ${sleepTimer.minutesLeft}m left` : ''}
            </p>
            <div className="flex gap-1 mb-6">
              {SLEEP_OPTIONS.map(({ label, value }) => {
                const active =
                  value === null
                    ? sleepTimer.selected === null
                    : sleepTimer.selected === value;
                return (
                  <button
                    key={label}
                    className={[
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                      active ? 'bg-accent text-canvas' : 'text-muted active:bg-raised',
                    ].join(' ')}
                    onClick={() => sleepTimer.set(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Voice */}
            {tts.voices.length > 0 && (
              <>
                <p className="text-muted text-xs uppercase tracking-widest mb-3">Voice</p>
                <div className="flex flex-col gap-1">
                  {tts.voices.map((v) => (
                    <button
                      key={v.name}
                      className={[
                        'text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                        tts.selectedVoice?.name === v.name
                          ? 'bg-accent text-canvas font-medium'
                          : 'text-fg active:bg-raised',
                      ].join(' ')}
                      onClick={() => tts.setVoice(v)}
                    >
                      <span>{v.name}</span>
                      <span className="text-xs ml-2 opacity-60">{v.lang}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlays */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full bg-surface rounded-t-2xl border-t border-border p-6 max-h-[80vh] overflow-y-auto">

            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-fg font-medium">Loading book...</p>
                <p className="text-muted text-sm">Extracting pages, detecting chapters</p>
              </div>
            )}

            {status === 'front-matter' && (
              <>
                <h2 className="text-fg font-semibold text-base mb-1">Front matter detected</h2>
                <p className="text-muted text-sm mb-5">
                  These pages look like front matter. Selected pages will be skipped.
                </p>
                <div className="flex flex-col gap-2 mb-6">
                  {frontMatterCandidates.map((idx) => {
                    const checked = frontMatterSkip.has(idx);
                    return (
                      <button
                        key={idx}
                        className="flex items-start gap-3 text-left p-3 rounded-lg bg-raised active:bg-border transition-colors"
                        onClick={() => toggleFrontMatterSkip(idx)}
                      >
                        <div className={[
                          'mt-0.5 w-5 h-5 rounded shrink-0 border flex items-center justify-center transition-colors',
                          checked ? 'bg-accent border-accent' : 'border-border',
                        ].join(' ')}>
                          {checked && (
                            <svg className="w-3 h-3 text-canvas" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-muted text-xs">Page {idx + 1}</span>
                          <p className="text-fg text-sm truncate">{book.pages[idx].trim().slice(0, 80)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl border border-border text-fg text-sm font-medium active:bg-raised transition-colors"
                    onClick={keepAllFrontMatter}
                  >
                    Keep all
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl bg-accent text-canvas text-sm font-medium active:bg-accent/80 transition-colors"
                    onClick={confirmFrontMatter}
                  >
                    Skip selected
                  </button>
                </div>
                <button
                  className="w-full mt-2 py-2 text-muted text-sm active:text-fg transition-colors"
                  onClick={skipAllFrontMatter}
                >
                  Skip all
                </button>
              </>
            )}

            {status === 'resume' && savedProgress && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-fg font-semibold">Picking up where you left off</p>
                    <p className="text-muted text-sm">
                      Page {savedProgress.page + 1} of {savedProgress.total}
                      {' '}({Math.round((savedProgress.page + 1) / savedProgress.total * 100)}% through)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl border border-border text-fg text-sm font-medium active:bg-raised transition-colors"
                    onClick={() => confirmResume(false)}
                  >
                    Start over
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl bg-accent text-canvas text-sm font-medium active:bg-accent/80 transition-colors"
                    onClick={() => confirmResume(true)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {isDone && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-fg font-semibold text-lg">Finished</p>
                  <p className="text-muted text-sm mt-1">"{book.title}"</p>
                </div>
                <button
                  className="mt-2 px-8 py-3 rounded-xl bg-accent text-canvas text-sm font-medium active:bg-accent/80 transition-colors"
                  onClick={close}
                >
                  Close
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
