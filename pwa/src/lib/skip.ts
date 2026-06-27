const TOC_HEADINGS = new Set(['table of contents', 'contents']);

const FRONT_MATTER_KEYWORDS = [
  'dedication',
  'dedicated to',
  'to my ',
  'for my ',
  'acknowledgements',
  'acknowledgments',
  'appreciation',
  'foreword',
  'preface',
  'copyright ©',
  'copyright (c)',
  'all rights reserved',
  'isbn',
  'published by',
  'first published',
  'printed in',
  'about the publisher',
  'about the author',
  'also by ',
  'other books by',
  'by the same author',
  'transcribed by',
  'volume one',
  'volume two',
  'volume three',
  'volume i ',
  'volume ii ',
  'volume iii ',
];

const TOC_LINE = /^.{3,}(?:\.{3,}|\s{3,})\d+\s*$/;

export function detectCandidates(pages: string[], limit = 20): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < Math.min(pages.length, limit); i++) {
    const stripped = pages[i].trim();
    if (!stripped || isToc(stripped) || isFrontMatter(stripped)) {
      candidates.push(i);
    }
  }
  return candidates;
}

function isToc(text: string): boolean {
  const lines = text.split('\n');
  const lowerFirst = lines.slice(0, 6).map((l) => l.toLowerCase().trim());

  if (lowerFirst.some((l) => TOC_HEADINGS.has(l))) return true;

  const tocCount = lines.filter((l) => TOC_LINE.test(l.trim())).length;
  if (lines.length > 0 && tocCount / lines.length > 0.35) return true;

  return false;
}

function isFrontMatter(text: string): boolean {
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 350) return false;
  // Very short pages are title cards, publisher stamps, or filler — always skip
  if (wordCount < 15) return true;
  const lower = text.toLowerCase();
  return FRONT_MATTER_KEYWORDS.some((kw) => lower.includes(kw));
}
