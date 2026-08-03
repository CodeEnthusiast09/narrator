# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo/personal use — the primary (and currently only) user is the project's developer. No plans for a broader audience were confirmed; revisit this section if that changes.

## Product Purpose

Narrator turns PDF books into audiobook-style listening sessions. It reads a PDF page by page with sentence-level highlighting, natural paragraph/chapter pauses, and automatic front-matter detection (skipping TOC, dedication, copyright, and publisher pages). Success means being able to consume a PDF hands-free — start a page, walk away, and resume exactly where you left off.

## Positioning

Unlike generic "read aloud" TTS tools that drone through raw extracted text top-to-bottom, Narrator understands document structure: it detects and skips front matter before the story starts, paces itself with paragraph pauses (350ms) and chapter pauses (1.5s) instead of reading continuously, and highlights the sentence currently being spoken. It is also fully local — piper-tts (CLI) and the Web Speech API (PWA) both run on-device, with no cloud TTS calls, no backend, and no account required.

## Operating Context

Two interfaces share one reading mechanism (PDF text extraction → chapter detection → front-matter detection → sentence splitting → paced playback with highlighting):

- **CLI** (`cli/`) — terminal player for Linux (Arch), Python 3.11+, keyboard-controlled (Space/arrows/+-/Q). Uses piper-tts with local `.onnx` voice models in `~/.config/narrator/models/`. Progress saved to `~/.config/narrator/progress.json`.
- **PWA** (`pwa/`) — installable mobile web app, targets Android/Chromium browsers (uses the File System Access API). Uses the Web Speech API, offline-capable after first load via service worker, progress and library stored in IndexedDB.

Primary use case: hands-free listening while doing something else (commute, chores, exercise) — not active on-screen reading.

## Capabilities and Constraints

Confirmed functionality:
- PDF import via file picker or drag-and-drop
- Sentence-level highlighting with auto-scroll; tap-to-seek (PWA)
- Paragraph pauses (350ms) and chapter pauses (1.5s)
- Smart front-matter detection with a confirmation step before reading starts
- Adjustable playback speed (CLI: 0.25x steps; PWA: 0.5x–2x, persisted)
- Per-book progress save/resume, prompted on next launch
- Voice selection, preferring local/offline voices
- PWA-only: text size steps, pitch control, sleep timer (auto-pause on expiry), library shelf with recent books and progress %, screen wake lock while reading, install-to-home-screen prompt

Confirmed constraints (durable, must be preserved by future work):
- Fully offline/local — no cloud TTS APIs, no backend, no analytics
- No monetization — stays free and personal, no ads, no paywalls
- No account or sign-in — progress and library stay device-local only (JSON file for CLI, IndexedDB for PWA)

Technical constraints from evidence:
- PWA depends on Chromium APIs (`showOpenFilePicker`, File System Access) — no confirmed iOS/Safari support
- CLI is Linux/Arch-specific
- Voice quality/options depend on installed piper models (CLI) or the OS/browser's available TTS voices (PWA) — varies per device

## Brand Commitments

Product name: Narrator.

## Evidence on Hand

- Existing app icon: `pwa/public/icon.svg` — a glowing speaker-wave mark on a dark radial-gradient background, reused inline as the in-app logo (`BookPicker.tsx`). Not yet confirmed as a locked brand asset.
- Current PWA theme/background color: `#0f0f0f`, set as the manifest default — not yet confirmed as a committed brand color.
- Current tagline in UI/README: "Your personal PDF audiobook reader."
- No user research, testimonials, analytics, or case studies exist — this is a single-user personal project. Future work must not invent any.
- No DESIGN.md, CLAUDE.md, or prior product-record docs exist anywhere in the repo.

## Product Principles

1. Structure-aware narration over naive text-to-speech — always detect and respect document structure (front matter, chapters, paragraphs) instead of reading raw text linearly.
2. Fully local and offline — no cloud TTS calls, no backend, no accounts; both interfaces run entirely on-device.
3. Hands-free first — design for a user whose eyes and hands are occupied elsewhere, not for active on-screen reading.
4. Personal tool, not a product — no monetization or growth features; optimize for the one user's workflow, not a general audience.
5. Resume exactly where you left off — progress persistence (page + sentence) is a core promise on both interfaces.
