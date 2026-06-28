import type { LibraryEntry } from '@/interfaces';

interface Props {
  entries: LibraryEntry[];
  onOpen: (entry: LibraryEntry) => void;
  onRemove: (id: string) => void;
}

const GRADIENTS: [string, string][] = [
  ['#4338ca', '#7c3aed'],
  ['#0369a1', '#0891b2'],
  ['#047857', '#0d9488'],
  ['#be185d', '#e11d48'],
  ['#b45309', '#d97706'],
  ['#7c3aed', '#db2777'],
  ['#0e7490', '#1d4ed8'],
  ['#065f46', '#0369a1'],
];

function coverGradient(title: string): [string, string] {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = ((h * 31) + title.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BookShelf({ entries, onOpen, onRemove }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="w-full">
      <p className="text-muted text-xs font-semibold uppercase tracking-wider px-1 mb-3">
        Recent
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-wrapper-md px-wrapper-md">
        {entries.map((entry) => {
          const [from, to] = coverGradient(entry.title);
          return (
            <div
              key={entry.id}
              className="shrink-0 w-32 cursor-pointer"
              onClick={() => onOpen(entry)}
            >
              {/* Cover */}
              <div
                className="relative w-32 h-44 rounded-xl overflow-hidden shadow-lg mb-2"
                style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
              >
                {/* Book icon */}
                <svg
                  className="absolute inset-0 m-auto w-10 h-10 text-white/30"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
                </svg>

                {/* Remove button */}
                <button
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(entry.id);
                  }}
                  aria-label="Remove from library"
                >
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <div
                    className="h-full bg-white/70 transition-all"
                    style={{ width: `${entry.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Info */}
              <p className="text-fg text-xs font-medium leading-snug line-clamp-2">
                {entry.title}
              </p>
              <p className="text-muted text-xs mt-0.5">
                {entry.progressPct}% · {timeAgo(entry.lastRead)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
