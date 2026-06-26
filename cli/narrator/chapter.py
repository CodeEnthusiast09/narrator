def detect_chapter_title(page_text: str) -> str | None:
    lines = [l.strip() for l in page_text.strip().split('\n') if l.strip()]
    if len(lines) < 2:
        return None

    first = lines[0]
    words = first.split()

    # Must be short — chapter titles are rarely more than 8 words
    if not (1 <= len(words) <= 8):
        return None

    # Titles don't end with sentence punctuation
    if first.endswith(('.', ',', ':', ';', '?', '!')):
        return None

    # Body text after the title must be substantial
    body = ' '.join(lines[1:])
    if len(body.split()) < 15:
        return None

    return first


def build_chapter_map(pages: list[str]) -> dict[int, str]:
    chapter_map: dict[int, str] = {}
    for i, text in enumerate(pages):
        title = detect_chapter_title(text)
        if title:
            chapter_map[i] = title
    return chapter_map
