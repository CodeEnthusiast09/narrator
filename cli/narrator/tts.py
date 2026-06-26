import re
import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from piper.voice import PiperVoice

_MAX_CHUNK_WORDS = 18


def split_sentences(text: str) -> list[str]:
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(
        r'\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig)\.\s',
        lambda m: m.group(0).replace('. ', '.\x00'),
        text,
        flags=re.IGNORECASE,
    )
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"\'\(])', text)
    chunks: list[str] = []
    for part in parts:
        part = part.replace('\x00', ' ').strip()
        if not part:
            continue
        if len(part.split()) <= _MAX_CHUNK_WORDS:
            chunks.append(part)
        else:
            clauses = re.split(r'(?<=[,;:])\s+', part)
            chunks.extend(c.strip() for c in clauses if c.strip())
    return chunks if chunks else [text]


class TTSPlayer:
    def __init__(self, voice: 'PiperVoice') -> None:
        import sounddevice as sd
        self._voice = voice
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._speed: float = 1.0
        self._pause_idx: int = 0
        self._paused: bool = False
        self._last_error: str | None = None
        # Prefer the 'pipewire' ALSA device — it handles rate conversion transparently.
        # Fall back to the system default if not found.
        self._device: int | None = None
        self._output_rate: int = 48000
        try:
            for dev in sd.query_devices():
                if dev['name'].lower() == 'pipewire' and dev['max_output_channels'] > 0:
                    self._device = dev['index']
                    self._output_rate = int(dev['default_samplerate'])
                    break
            if self._device is None:
                info = sd.query_devices(kind='output')
                self._output_rate = int(info['default_samplerate'])
        except Exception:
            pass

    @property
    def pause_idx(self) -> int:
        return self._pause_idx

    @property
    def last_error(self) -> str | None:
        return self._last_error

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
        self._kill_thread()
        self._paused = False
        self._last_error = None
        self._pause_idx = start_from
        self._stop_event.clear()
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
        try:
            import numpy as np
            import sounddevice as sd
            from piper.config import SynthesisConfig

            for i in range(start_from, len(sentences)):
                if self._stop_event.is_set():
                    return

                self._pause_idx = i
                sentence = sentences[i].strip()
                if not sentence:
                    continue

                # Chapter title pause sentinel — sleep instead of speak
                if sentence == '...':
                    import time
                    time.sleep(1.5)
                    continue

                syn_config = SynthesisConfig(length_scale=round(1.0 / self._speed, 3))
                chunks = list(self._voice.synthesize(sentence, syn_config=syn_config))

                if not chunks or self._stop_event.is_set():
                    continue

                audio = np.concatenate([c.audio_float_array for c in chunks])
                src_rate = chunks[0].sample_rate

                # Resample to device's native rate if needed
                if src_rate != self._output_rate:
                    old_len = len(audio)
                    new_len = int(old_len * self._output_rate / src_rate)
                    audio = np.interp(
                        np.linspace(0, old_len - 1, new_len),
                        np.arange(old_len),
                        audio,
                    )

                if self._stop_event.is_set():
                    return

                sd.play(audio, samplerate=self._output_rate, device=self._device)
                sd.wait()

            if not self._stop_event.is_set() and on_complete:
                on_complete()

        except Exception as exc:
            self._last_error = str(exc)
            self._stop_event.set()

    def pause(self) -> None:
        self._paused = True
        self._kill_thread()

    def resume(self, sentences: list[str], on_complete=None) -> None:
        if not self._paused:
            return
        self._paused = False
        self._last_error = None
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._worker,
            args=(sentences, self._pause_idx, on_complete),
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._paused = False
        self._kill_thread()

    def _kill_thread(self) -> None:
        import sounddevice as sd
        self._stop_event.set()
        sd.stop()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def is_paused(self) -> bool:
        return self._paused

    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()
