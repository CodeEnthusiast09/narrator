export function detectChapterTitle(pageText: string): string | null {
  const lines = pageText
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const first = lines[0];
  const words = first.split(/\s+/);

  if (words.length < 1 || words.length > 8) return null;
  if (/[.,;:?!]$/.test(first)) return null;

  const body = lines.slice(1).join(' ');
  if (body.split(/\s+/).length < 15) return null;

  return first;
}

export function buildChapterMap(pages: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i < pages.length; i++) {
    const title = detectChapterTitle(pages[i]);
    if (title) map[i] = title;
  }
  return map;
}
