import re
from pathlib import Path

import pdfplumber


def extract_pages(pdf_path: str) -> tuple[str, list[str]]:
    pages: list[str] = []
    title = _title_from_path(pdf_path)

    with pdfplumber.open(pdf_path) as pdf:
        meta = pdf.metadata or {}
        candidate = (meta.get('Title') or '').strip()
        if candidate and not candidate.lower().endswith('.pdf'):
            title = candidate

        for page in pdf.pages:
            text = page.extract_text() or ''
            pages.append(text)

    return title, pages


def _title_from_path(pdf_path: str) -> str:
    stem = Path(pdf_path).stem
    stem = re.sub(r'[-_.]', ' ', stem)
    stem = re.sub(r'\s+', ' ', stem).strip()
    return stem.title()
