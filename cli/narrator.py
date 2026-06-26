#!/usr/bin/env python3
import argparse
import curses
import shutil
import sys
from pathlib import Path

from narrator.pdf import extract_pages
from narrator.progress import load_progress
from narrator.skip import detect_candidates
from narrator.ui import run_player


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Narrator — PDF audiobook reader',
        epilog='Controls: [SPACE] pause  [→] next page  [←] prev page  [+/-] speed  [Q] quit',
    )
    parser.add_argument('pdf', help='Path to the PDF file')
    parser.add_argument(
        '--auto-skip',
        action='store_true',
        help='Skip front matter automatically without asking',
    )
    args = parser.parse_args()

    # Fail fast before loading anything
    if not shutil.which('espeak-ng'):
        print('Error: espeak-ng is not installed.', file=sys.stderr)
        print('Install it: sudo pacman -S espeak-ng', file=sys.stderr)
        sys.exit(1)

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

    print(f'  Title : {title}')
    print(f'  Pages : {len(pages)}\n')

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

    # First readable page (skip over any skipped leading pages)
    first_page = 0
    while first_page < len(pages) and first_page in skip_pages:
        first_page += 1

    # Resume check
    start_page = first_page
    progress = load_progress(pdf_path)

    if progress and progress.get('page', 0) > first_page:
        saved = progress['page']
        pct = int((saved + 1) / len(pages) * 100)
        print(
            f'Picking up where you left off — page {saved + 1} of {len(pages)}'
            f' ({pct}% through "{title}").'
        )
        choice = input('Continue from here? [y]es / [n]o, start fresh: ').strip().lower()
        if choice != 'n':
            start_page = saved
        print()

    input('Press Enter to open the player.')

    curses.wrapper(run_player, pdf_path, title, pages, skip_pages, start_page)

    print('\nSee you next time.')


if __name__ == '__main__':
    main()
