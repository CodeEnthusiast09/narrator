# Narrator

PDF audiobook reader. Reads novels to you page by page with pause, skip, and smart front-matter detection.

Two interfaces:
- **CLI** — terminal player for Linux (Arch), keyboard-controlled
- **PWA** — mobile web app for Android (coming next)

---

## CLI

### Requirements

```bash
sudo pacman -S espeak-ng
cd cli
pip install -r requirements.txt
```

### Usage

```bash
python narrator.py path/to/book.pdf
python narrator.py path/to/book.pdf --auto-skip   # skip front matter without asking
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

- Detects and asks about front matter (TOC, dedication, acknowledgements, copyright, etc.)
- Saves progress per book in `~/.config/narrator/progress.json`
- Resumes with a prompt on next launch
- Adjustable reading speed (0.5x – 3.0x)

---

## PWA

Coming next — Android mobile reader with the same feature set.
