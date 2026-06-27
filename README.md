# Narrator

PDF audiobook reader. Reads novels to you page by page with sentence highlighting, paragraph pauses, and smart front-matter detection.

Two interfaces:

- **CLI** — terminal player for Linux (Arch), keyboard-controlled, powered by [piper-tts](https://github.com/rhasspy/piper)
- **PWA** — installable mobile web app for Android, powered by the Web Speech API

---

## CLI

### Requirements

- Python 3.11+
- [piper-tts](https://github.com/rhasspy/piper) voice models

```bash
cd cli
pip install -r requirements.txt
```

Download a voice model into `~/.config/narrator/models/`:

```bash
mkdir -p ~/.config/narrator/models && cd ~/.config/narrator/models
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json
```

### Usage

```bash
python narrator.py path/to/book.pdf
python narrator.py path/to/book.pdf --auto-skip          # skip front matter without asking
python narrator.py path/to/book.pdf --voice en-gb        # pick voice by short name
python narrator.py path/to/book.pdf --model /path/to.onnx  # explicit model path
```

### Controls

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `→` | Next page |
| `←` | Previous page |
| `+` / `=` | Speed up (0.25x steps) |
| `-` | Slow down (0.25x steps) |
| `Q` | Quit (progress saved automatically) |

### Features

- Natural TTS via piper with offline voice models
- Sentence-level highlighting in the terminal with auto-scroll
- Paragraph breathing pauses (350ms) and chapter pauses (1.5s)
- Opening announcement ("Now reading / Continuing...")
- Smart front-matter detection (TOC, dedication, copyright, publisher pages, title cards)
- Saves progress per book — resumes with a prompt on next launch
- Adjustable reading speed (0.25x steps)

---

## PWA

Installable progressive web app — open in Chrome on Android and add to home screen.

### Features

- Drag-and-drop or file picker PDF import
- Sentence-level highlighting with auto-scroll
- Paragraph and chapter pauses
- Opening announcement on first read and resume
- Voice selector (prefers local/offline voices)
- Speed controls (0.5x – 2x)
- Progress saved to IndexedDB — resumes where you left off
- Front-matter confirmation UI before reading starts
- Works offline after first load (service worker)

### Development

```bash
cd pwa
pnpm install
pnpm dev
```

```bash
pnpm build   # production build
pnpm preview # preview the production build
```
