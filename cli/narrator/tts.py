import re
import shutil
import subprocess
import threading
import time


def check_espeak() -> None:
    if not shutil.which('espeak-ng'):
        raise RuntimeError(
            'espeak-ng is not installed.\n'
            'Install it with: sudo pacman -S espeak-ng'
        )


def split_sentences(text: str) -> list[str]:
    text = re.sub(r'\s+', ' ', text).strip()
    # Protect common abbreviations so they don't trigger sentence splits
    text = re.sub(
        r'\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig)\.\s',
        lambda m: m.group(0).replace('. ', '.\x00'),
        text,
        flags=re.IGNORECASE,
    )
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"\'\(])', text)
    result: list[str] = []
    for p in parts:
        p = p.replace('\x00', ' ').strip()
        if p:
            result.append(p)
    return result if result else [text]


class TTSPlayer:
    BASE_RATE = 160  # words per minute at 1.0x

    def __init__(self) -> None:
        check_espeak()
        self._process: subprocess.Popen | None = None
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._lock = threading.Lock()
        self._speed: float = 1.0
        self._pause_idx: int = 0

    @property
    def speed(self) -> float:
        return self._speed

    @speed.setter
    def speed(self, value: float) -> None:
        self._speed = round(max(0.5, min(3.0, value)), 2)

    def speak(
        self,
        sentences: list[str],
        start_from: int = 0,
        on_complete=None,
    ) -> None:
        self.stop()
        self._stop_event.clear()
        self._pause_event.clear()
        self._pause_idx = start_from
        self._thread = threading.Thread(
            target=self._worker,
            args=(sentences, start_from, on_complete),
            daemon=True,
        )
        self._thread.start()

    def _worker(
        self,
        sentences: list[str],
        start_from: int,
        on_complete,
    ) -> None:
        rate = int(self.BASE_RATE * self._speed)

        for i in range(start_from, len(sentences)):
            if self._stop_event.is_set():
                return

            while self._pause_event.is_set():
                if self._stop_event.is_set():
                    return
                time.sleep(0.05)

            self._pause_idx = i
            sentence = sentences[i].strip()
            if not sentence:
                continue

            with self._lock:
                if self._stop_event.is_set():
                    return
                self._process = subprocess.Popen(
                    ['espeak-ng', '-s', str(rate), sentence],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )

            self._process.wait()

            with self._lock:
                self._process = None

        if not self._stop_event.is_set() and on_complete:
            on_complete()

    def pause(self) -> None:
        self._pause_event.set()
        with self._lock:
            if self._process and self._process.poll() is None:
                self._process.terminate()
                self._process.wait()
                self._process = None

    def resume(self, sentences: list[str], on_complete=None) -> None:
        if not self._pause_event.is_set():
            return
        self._pause_event.clear()
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._worker,
            args=(sentences, self._pause_idx, on_complete),
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._pause_event.clear()
        with self._lock:
            if self._process and self._process.poll() is None:
                self._process.terminate()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def is_paused(self) -> bool:
        return self._pause_event.is_set()

    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()
