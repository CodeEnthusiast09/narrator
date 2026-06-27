const MAX_CHUNK_WORDS = 18;

export const CHAPTER_PAUSE = '...';
export const PARA_PAUSE = '[p]';

export function splitSentences(text: string): string[] {
  let normalized = text.replace(/\s+/g, ' ').trim();

  normalized = normalized.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig)\.\s/gi,
    (m) => m.replace('. ', '.\x00'),
  );

  const parts = normalized.split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
  const chunks: string[] = [];

  for (const raw of parts) {
    const part = raw.replace(/\x00/g, ' ').trim();
    if (!part) continue;

    if (part.split(' ').length <= MAX_CHUNK_WORDS) {
      chunks.push(part);
    } else {
      const clauses = part.split(/(?<=[,;:])\s+/);
      for (const c of clauses) {
        const trimmed = c.trim();
        if (trimmed) chunks.push(trimmed);
      }
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

// Splits a full page into sentences, inserting PARA_PAUSE between paragraphs
// so the reader breathes naturally between blocks of text.
export function buildPageSentences(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const result: string[] = [];
  let first = true;

  for (const para of paragraphs) {
    const stripped = para.replace(/\n/g, ' ').trim();
    if (!stripped) continue;
    if (!first) result.push(PARA_PAUSE);
    result.push(...splitSentences(stripped));
    first = false;
  }

  return result.length > 0 ? result : splitSentences(text);
}
