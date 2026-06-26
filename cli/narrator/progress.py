import json
import os
from pathlib import Path

_PROGRESS_DIR = Path.home() / '.config' / 'narrator'
_PROGRESS_FILE = _PROGRESS_DIR / 'progress.json'


def load_progress(pdf_path: str) -> dict | None:
    if not _PROGRESS_FILE.exists():
        return None
    try:
        data: dict = json.loads(_PROGRESS_FILE.read_text())
        return data.get(pdf_path)
    except (json.JSONDecodeError, OSError):
        return None


def save_progress(pdf_path: str, page: int, total: int, title: str) -> None:
    _PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
    data: dict = {}
    if _PROGRESS_FILE.exists():
        try:
            data = json.loads(_PROGRESS_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    data[pdf_path] = {'page': page, 'total': total, 'title': title}
    _PROGRESS_FILE.write_text(json.dumps(data, indent=2))


def clear_progress(pdf_path: str) -> None:
    if not _PROGRESS_FILE.exists():
        return
    try:
        data: dict = json.loads(_PROGRESS_FILE.read_text())
        data.pop(pdf_path, None)
        _PROGRESS_FILE.write_text(json.dumps(data, indent=2))
    except (json.JSONDecodeError, OSError):
        pass
