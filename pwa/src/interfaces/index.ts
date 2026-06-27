export interface Book {
  key: string;
  title: string;
  pages: string[];
  skipPages: Set<number>;
  chapterMap: Record<number, string>;
}

export interface Progress {
  page: number;
  sentence: number;
  total: number;
  title: string;
}

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'front-matter'
  | 'resume'
  | 'reading'
  | 'paused'
  | 'done';
