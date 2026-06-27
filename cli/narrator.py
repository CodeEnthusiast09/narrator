#!/usr/bin/env python3
import argparse
import curses
import shutil
import sys
from pathlib import Path

from narrator.chapter import build_chapter_map
from narrator.pdf import extract_pages
from narrator.progress import load_progress
from narrator.skip import detect_candidates
from narrator.ui import run_player

_MODELS_DIR = Path.home() / '.config' / 'narrator' / 'models'
_DEFAULT_MODEL = _MODELS_DIR / 'en_US-amy-medium.onnx'


def _resolve_voice(name: str) -> Path:
    """Find a model in the models dir by short name (e.g. 'en-gb' or 'amy')."""
    needle = name.lower().replace('-', '_')
    candidates = sorted(_MODELS_DIR.glob('*.onnx'))
    for path in candidates:
        stem = path.stem.lower().replace('-', '_')
        if needle in stem:
            return path
    # Nothing matched — show what's available
    if candidates:
        names = ', '.join(p.stem for p in candidates)
        print(f'Error: no model matching "{name}". Available: {names}', file=sys.stderr)
    else:
        print(f'Error: no models found in {_MODELS_DIR}', file=sys.stderr)
        print('Download a model and its .json config into that directory.', file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Narrator — PDF audiobook reader',
        epilog='Controls: [SPACE] pause  [→] next page  [←] prev page  [+/-] speed  [Q] quit',
    )
    parser.add_argument('pdf', nargs='?', help='Path to the PDF file')
    parser.add_argument(
        '--auto-skip',
        action='store_true',
        help='Skip front matter automatically without asking',
    )

    model_group = parser.add_mutually_exclusive_group()
    model_group.add_argument(
        '--model',
        metavar='PATH',
        help='Explicit path to a piper .onnx voice model',
    )
    model_group.add_argument(
        '--voice',
        metavar='NAME',
        help='Short voice name to search for in ~/.config/narrator/models/ (e.g. en-gb, amy)',
    )

    args = parser.parse_args()

    if args.model:
        model_path = Path(args.model)
        if not model_path.exists():
            print(f'Error: voice model not found at {model_path}', file=sys.stderr)
            sys.exit(1)
    elif args.voice:
        model_path = _resolve_voice(args.voice)
    else:
        model_path = _DEFAULT_MODEL
        if not model_path.exists():
            print(f'Error: default voice model not found at {model_path}', file=sys.stderr)
            print(file=sys.stderr)
            print('Download a model and its .json config into ~/.config/narrator/models/', file=sys.stderr)
            print('Example (en_US-amy-medium):', file=sys.stderr)
            print('  mkdir -p ~/.config/narrator/models && cd ~/.config/narrator/models', file=sys.stderr)
            print('  wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx', file=sys.stderr)
            print('  wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json', file=sys.stderr)
            sys.exit(1)

    if not args.pdf:
        parser.error('pdf argument is required')

    pdf_path = str(Path(args.pdf).resolve())
    if not Path(pdf_path).exists():
        print(f'Error: file not found — {pdf_path}', file=sys.stderr)
        sys.exit(1)

    print(f'\nLoading {Path(pdf_path).name} ...')

    try:
        title, pages = extract_pages(pdf_path)
    except Exception as exc:
        print(f'Error reading PDF: {exc}', file=sys.stderr)
        sys.exit(1)

    if not any(p.strip() for p in pages):
        print(
            'Error: could not extract any text. The PDF may be image-based.',
            file=sys.stderr,
        )
        sys.exit(1)

    chapter_map = build_chapter_map(pages)

    print(f'  Title    : {title}')
    print(f'  Pages    : {len(pages)}')
    print(f'  Chapters : {len(chapter_map)}\n')

    # Smart skip
    candidates = detect_candidates(pages)
    skip_pages: set[int] = set()

    if candidates:
        if args.auto_skip:
            skip_pages = set(candidates)
            print(f'Auto-skipping {len(skip_pages)} front matter page(s).\n')
        else:
            print(f'Found {len(candidates)} page(s) that look like front matter:\n')
            skip_all = False
            for idx in candidates:
                if skip_all:
                    skip_pages.add(idx)
                    continue
                preview = ' '.join(pages[idx].split())[:120]
                print(f'  Page {idx + 1}: {preview}...')
                choice = (
                    input(f'  Skip page {idx + 1}? [y]es / [n]o / [a]ll remaining: ')
                    .strip()
                    .lower()
                )
                if choice == 'a':
                    skip_all = True
                    skip_pages.add(idx)
                elif choice == 'y':
                    skip_pages.add(idx)
            print()

    # First readable page
    first_page = 0
    while first_page < len(pages) and first_page in skip_pages:
        first_page += 1

    # Resume check
    start_page = first_page
    start_sentence = 0
    progress = load_progress(pdf_path)

    if progress and progress.get('page', 0) >= first_page:
        saved = progress['page']
        pct = int((saved + 1) / len(pages) * 100)
        print(
            f'Picking up where you left off — page {saved + 1} of {len(pages)}'
            f' ({pct}% through "{title}").'
        )
        choice = input('Continue from here? [y]es / [n]o, start fresh: ').strip().lower()
        if choice != 'n':
            start_page = saved
            start_sentence = progress.get('sentence', 0)
        print()

    # Load voice model before launching curses so output is visible
    print(f'Loading voice model ({model_path.stem}) ...')
    from piper.voice import PiperVoice
    voice = PiperVoice.load(str(model_path))
    print('Ready.\n')

    input('Press Enter to open the player.')

    if start_sentence == 0 and start_page == first_page:
        announce = f'Now reading: {title}.'
    else:
        announce = f'Continuing {title}.'

    curses.wrapper(run_player, pdf_path, title, pages, skip_pages, chapter_map, start_page, start_sentence, voice, announce)

    print('\nSee you next time.')


if __name__ == '__main__':
    main()
