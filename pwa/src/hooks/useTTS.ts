import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTER_PAUSE, PARA_PAUSE } from '@/lib/sentences';

const CHAPTER_PAUSE_MS = 1500;
const PARA_PAUSE_MS = 350;

export interface TTSControls {
  speak: (sentences: string[], startFrom: number, onComplete: () => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  pauseIdx: number;
  speed: number;
  setSpeed: (speed: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

export function useTTS(): TTSControls {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeedState] = useState(1.0);
  const [pauseIdx, setPauseIdx] = useState(0);

  const r = useRef({
    sentences: [] as string[],
    idx: 0,
    paused: false,
    stopped: true,
    onComplete: null as (() => void) | null,
    speed: 1.0,
    voice: null as SpeechSynthesisVoice | null,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  useEffect(() => {
    const load = () => {
      const all = speechSynthesis.getVoices();
      const local = all.filter((v) => v.localService);
      const list = local.length > 0 ? local : all;
      setVoices(list);
      if (!r.current.voice && list[0]) {
        r.current.voice = list[0];
        setSelectedVoice(list[0]);
      }
    };
    speechSynthesis.addEventListener('voiceschanged', load);
    load();
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    return () => {
      r.current.stopped = true;
      if (r.current.timer) clearTimeout(r.current.timer);
      speechSynthesis.cancel();
    };
  }, []);

  // tickRef holds the latest tick function; all state accessed via r.current
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    const state = r.current;
    if (state.stopped || state.paused) return;

    const i = state.idx;
    if (i >= state.sentences.length) {
      state.onComplete?.();
      return;
    }

    setPauseIdx(i);
    const sentence = state.sentences[i].trim();

    if (!sentence) {
      state.idx++;
      tickRef.current();
      return;
    }

    if (sentence === CHAPTER_PAUSE || sentence === PARA_PAUSE) {
      const ms = sentence === CHAPTER_PAUSE ? CHAPTER_PAUSE_MS : PARA_PAUSE_MS;
      state.timer = setTimeout(() => {
        state.timer = null;
        if (!state.stopped && !state.paused) {
          state.idx++;
          tickRef.current();
        }
      }, ms);
      return;
    }

    // Lazily pick a voice if voices weren't loaded at init time
    if (!state.voice) {
      const available = speechSynthesis.getVoices();
      const local = available.filter((v) => v.localService);
      const picked = (local.length > 0 ? local : available)[0] ?? null;
      if (picked) {
        state.voice = picked;
        setSelectedVoice(picked);
        setVoices(local.length > 0 ? local : available);
      }
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = state.speed;
    if (state.voice) utterance.voice = state.voice;

    utterance.onend = () => {
      if (!state.stopped && !state.paused) {
        state.idx++;
        tickRef.current();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.error('TTS error:', e.error);
      }
    };

    speechSynthesis.speak(utterance);
  };

  const cancelAll = useCallback(() => {
    const state = r.current;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (sentences: string[], startFrom: number, onComplete: () => void) => {
      cancelAll();
      const state = r.current;
      state.sentences = sentences;
      state.idx = startFrom;
      state.paused = false;
      state.stopped = false;
      state.onComplete = onComplete;
      setPauseIdx(startFrom);
      tickRef.current();
    },
    [cancelAll],
  );

  const pause = useCallback(() => {
    setPauseIdx(r.current.idx);
    r.current.paused = true;
    cancelAll();
  }, [cancelAll]);

  const resume = useCallback(() => {
    if (!r.current.paused) return;
    r.current.paused = false;
    r.current.stopped = false;
    tickRef.current();
  }, []);

  const stop = useCallback(() => {
    r.current.stopped = true;
    r.current.paused = false;
    r.current.idx = 0;
    cancelAll();
    setPauseIdx(0);
  }, [cancelAll]);

  const setSpeed = useCallback((s: number) => {
    const clamped = Math.max(0.5, Math.min(3.0, Math.round(s * 4) / 4));
    r.current.speed = clamped;
    setSpeedState(clamped);
  }, []);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    r.current.voice = voice;
    setSelectedVoice(voice);
  }, []);

  return { speak, pause, resume, stop, pauseIdx, speed, setSpeed, voices, selectedVoice, setVoice };
}
