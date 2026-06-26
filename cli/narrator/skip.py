import re

_TOC_HEADINGS = {'table of contents', 'contents'}

_FRONT_MATTER_KEYWORDS = {
    'dedication',
    'dedicated to',
    'to my ',
    'for my ',
    'acknowledgements',
    'acknowledgments',
    'appreciation',
    'foreword',
    'preface',
    'copyright \xa9',
    'copyright (c)',
    'all rights reserved',
    'isbn',
    'published by',
    'first published',
    'printed in',
}

# Lines that look like "Chapter Title ............. 12" or "Chapter Title    12"
_TOC_LINE = re.compile(r'.{3,}(?:\.{3,}|\s{3,})\d+\s*$')


def detect_candidates(pages: list[str], limit: int = 20) -> list[int]:
    candidates: list[int] = []
    for i, text in enumerate(pages[:limit]):
        stripped = text.strip()
        if not stripped:
            candidates.append(i)
        elif _is_toc(stripped) or _is_front_matter(stripped):
            candidates.append(i)
    return candidates


def _is_toc(text: str) -> bool:
    lines = text.split('\n')
    lower_first = [l.lower().strip() for l in lines[:6]]

    if any(l in _TOC_HEADINGS for l in lower_first):
        return True

    toc_count = sum(1 for l in lines if _TOC_LINE.match(l.strip()))
    if lines and toc_count / len(lines) > 0.35:
        return True

    return False


def _is_front_matter(text: str) -> bool:
    word_count = len(text.split())
    if word_count > 350:
        return False
    lower = text.lower()
    return any(kw in lower for kw in _FRONT_MATTER_KEYWORDS)
