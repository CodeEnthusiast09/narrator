import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Loaded on first use instead of at module scope so the ~600KB pdfjs-dist
// library isn't pulled into the eagerly-loaded main bundle — most sessions
// open the app without opening a file first.
let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      return mod;
    });
  }
  return pdfjsLibPromise;
}

export async function extractPages(file: File): Promise<{ title: string; pages: string[] }> {
  const pdfjsLib = await loadPdfjsLib();
  const buffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch (err) {
    // pdf.js's own exception classes aren't all re-exported from the package's
    // main entry, but every one of them sets `.name` to match, so checking
    // that string is the reliable way to tell a locked PDF from a corrupt one.
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new Error("This PDF is password-protected and can't be opened.");
    }
    throw new Error("Couldn't read this file — it may not be a valid PDF.");
  }

  let title = titleFromFilename(file.name);

  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, unknown>;
    const candidate = typeof info['Title'] === 'string' ? info['Title'].trim() : '';
    if (candidate && !candidate.toLowerCase().endsWith('.pdf')) {
      title = candidate;
    }
  } catch {
    // metadata unavailable — use filename
  }

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let text = '';
    for (const item of content.items) {
      if ('str' in item) {
        const t = item as TextItem;
        text += t.str;
        if (t.hasEOL) text += '\n';
      }
    }
    pages.push(text.replace(/\n{3,}/g, '\n\n'));
  }

  return { title, pages };
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
