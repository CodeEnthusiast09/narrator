import curses
import threading
import time
from dataclasses import dataclass, field

from narrator.chapter import build_chapter_map
from narrator.progress import save_progress
from narrator.tts import CHAPTER_PAUSE, PARA_PAUSE, TTSPlayer, build_page_sentences


@dataclass
class _State:
    title: str
    pages: list[str]
    skip_pages: set[int]
    pdf_path: str
    current_page: int
    chapter_map: dict[int, str] = field(default_factory=dict)
    speed: float = 1.0
    paused: bool = False
    done: bool = False
    error: str | None = None

    @property
    def total(self) -> int:
        return len(self.pages)

    @property
    def current_text(self) -> str:
        return self.pages[self.current_page]

    @property
    def current_chapter(self) -> str | None:
        for p in range(self.current_page, -1, -1):
            if p in self.chapter_map:
                return self.chapter_map[p]
        return None

    def next_page(self) -> bool:
        p = self.current_page + 1
        while p < self.total and p in self.skip_pages:
            p += 1
        if p < self.total:
            self.current_page = p
            return True
        return False

    def prev_page(self) -> bool:
        p = self.current_page - 1
        while p >= 0 and p in self.skip_pages:
            p -= 1
        if p >= 0:
            self.current_page = p
            return True
        return False


def _draw(
    stdscr,
    state: _State,
    has_colors: bool,
    page_sents: list[str] | None = None,
    display_idx: int = 0,
) -> None:
    try:
        stdscr.erase()
        h, w = stdscr.getmaxyx()

        if h < 8 or w < 40:
            stdscr.addstr(0, 0, 'Terminal too small — resize to continue.')
            stdscr.refresh()
            return

        # Header row
        chapter = state.current_chapter
        if chapter:
            subtitle = f'{state.title}  ›  {chapter}'
        else:
            subtitle = state.title
        safe_subtitle = subtitle[:max(0, w - 24)]
        header = f' NARRATOR  |  {safe_subtitle}'
        page_info = f' {state.current_page + 1}/{state.total} '
        try:
            stdscr.addstr(0, 0, header, curses.A_BOLD)
            if len(page_info) <= w:
                stdscr.addstr(0, w - len(page_info), page_info)
        except curses.error:
            pass

        # Progress bar
        pct = (state.current_page + 1) / state.total
        bar_w = max(0, w - 1)
        filled = int(bar_w * pct)
        bar = '█' * filled + '░' * (bar_w - filled)
        try:
            stdscr.addstr(1, 0, bar)
        except curses.error:
            pass

        # Top separator
        try:
            stdscr.addstr(2, 0, '─' * (w - 1))
        except curses.error:
            pass

        # Page text — sentence-level highlighting with auto-scroll
        text_start = 3
        footer_rows = 4
        text_h = max(0, h - text_start - footer_rows)
        text_w = max(10, w - 4)

        sents = page_sents or []
        is_reading = not state.paused and not state.done and state.error is None

        # Layout pass: flow tokens into (row, col, token, is_active) tuples
        layout: list[tuple[int, int, str, bool]] = []
        row, col, active_row = 0, 0, 0
        for i, sent in enumerate(sents):
            is_active = is_reading and i == display_idx
            if is_active:
                active_row = row
            if sent in (CHAPTER_PAUSE, PARA_PAUSE):
                row += 1
                col = 0
                continue
            for word in sent.split():
                token = word + ' '
                if col + len(token) > text_w:
                    row += 1
                    col = 0
                layout.append((row, col, token, is_active))
                col += len(token)

        # Scroll to keep active sentence in upper third
        scroll = max(0, active_row - text_h // 3)

        # Render pass
        for r, c, token, is_active in layout:
            display_row = r - scroll + text_start
            if display_row < text_start or display_row >= text_start + text_h:
                continue
            if is_active and has_colors:
                attr = curses.color_pair(5) | curses.A_BOLD
            elif is_active:
                attr = curses.A_BOLD
            else:
                attr = curses.A_DIM
            try:
                stdscr.addstr(display_row, c + 2, token, attr)
            except curses.error:
                pass

        # Bottom separator
        sep_y = h - footer_rows
        try:
            stdscr.addstr(sep_y, 0, '─' * (w - 1))
        except curses.error:
            pass

        # Status + speed  (or error if one occurred)
        if state.error:
            err_attr = (curses.color_pair(4) | curses.A_BOLD) if has_colors else curses.A_BOLD
            try:
                stdscr.addstr(h - 3, 2, f'ERROR: {state.error}'[:w - 4], err_attr)
            except curses.error:
                pass
        else:
            if state.done:
                status_text = '✓ DONE'
                attr = (curses.color_pair(2) | curses.A_BOLD) if has_colors else curses.A_BOLD
            elif state.paused:
                status_text = '⏸ PAUSED'
                attr = (curses.color_pair(3) | curses.A_BOLD) if has_colors else curses.A_BOLD
            else:
                status_text = '▶ READING'
                attr = (curses.color_pair(2) | curses.A_BOLD) if has_colors else curses.A_BOLD

            speed_text = f'  Speed: {state.speed:.2f}x'
            try:
                stdscr.addstr(h - 3, 2, status_text, attr)
                stdscr.addstr(h - 3, 2 + len(status_text), speed_text)
            except curses.error:
                pass

        # Controls hint
        controls = '[SPACE] Pause  [→] Next  [←] Back  [+/-] Speed  [Q] Quit'
        try:
            stdscr.addstr(h - 2, 2, controls[:w - 4])
        except curses.error:
            pass

        stdscr.refresh()
    except curses.error:
        pass


def run_player(
    stdscr,
    pdf_path: str,
    title: str,
    pages: list[str],
    skip_pages: set[int],
    chapter_map: dict[int, str],
    start_page: int,
    start_sentence: int = 0,
    voice=None,
    announce: str = '',
) -> None:
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.keypad(True)

    has_colors = curses.has_colors()
    if has_colors:
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(2, curses.COLOR_GREEN, -1)   # reading / done
        curses.init_pair(3, curses.COLOR_YELLOW, -1)  # paused
        curses.init_pair(4, curses.COLOR_RED, -1)     # error
        curses.init_pair(5, curses.COLOR_WHITE, -1)   # active sentence

    state = _State(
        title=title,
        pages=pages,
        skip_pages=skip_pages,
        pdf_path=pdf_path,
        chapter_map=chapter_map,
        current_page=start_page,
    )

    tts = TTSPlayer(voice)
    page_done = threading.Event()
    announce_offset = 0  # how many leading sentences belong to the announcement

    def on_page_done() -> None:
        page_done.set()

    def page_sents() -> list[str]:
        """Sentences for the current page, without any announcement prefix."""
        chunks = build_page_sentences(state.current_text)
        if state.current_page in state.chapter_map and chunks:
            chunks = [chunks[0], CHAPTER_PAUSE] + chunks[1:]
        return chunks

    def start_reading(sentence_idx: int = 0, first: bool = False) -> None:
        nonlocal announce_offset
        sents = page_sents()
        if first and announce:
            announce_offset = 2  # [announce, CHAPTER_PAUSE] prefix
            tts.speak([announce, CHAPTER_PAUSE] + sents, start_from=sentence_idx, on_complete=on_page_done)
        else:
            announce_offset = 0
            tts.speak(sents, start_from=sentence_idx, on_complete=on_page_done)

    start_reading(start_sentence, first=True)

    try:
        while True:
            if state.done:
                _draw(stdscr, state, has_colors, page_sents(), 0)
                if stdscr.getch() in (ord('q'), ord('Q')):
                    break
                time.sleep(0.1)
                continue

            # Surface TTS errors into the UI
            if tts.last_error and not state.error:
                state.error = tts.last_error

            # Auto-advance when a page finishes
            if page_done.is_set():
                page_done.clear()
                if state.next_page():
                    save_progress(state.pdf_path, state.current_page, 0, state.total, state.title)
                    start_reading()
                else:
                    state.done = True

            key = stdscr.getch()

            if key in (ord('q'), ord('Q')):
                break

            elif key == ord(' '):
                if state.paused:
                    state.paused = False
                    tts.resume(page_sents(), on_complete=on_page_done)
                else:
                    state.paused = True
                    tts.pause()

            elif key == curses.KEY_RIGHT:
                page_done.clear()
                state.paused = False
                if state.next_page():
                    save_progress(state.pdf_path, state.current_page, 0, state.total, state.title)
                    start_reading()
                else:
                    state.done = True

            elif key == curses.KEY_LEFT:
                page_done.clear()
                state.paused = False
                if state.prev_page():
                    save_progress(state.pdf_path, state.current_page, 0, state.total, state.title)
                    start_reading()

            elif key in (ord('+'), ord('=')):
                tts.speed += 0.25
                state.speed = tts.speed

            elif key == ord('-'):
                tts.speed -= 0.25
                state.speed = tts.speed

            display_idx = max(0, tts.pause_idx - announce_offset)
            _draw(stdscr, state, has_colors, page_sents(), display_idx)
            time.sleep(0.05)

    finally:
        tts.stop()
        if not state.done:
            save_progress(
                state.pdf_path,
                state.current_page,
                tts.pause_idx,
                state.total,
                state.title,
            )
