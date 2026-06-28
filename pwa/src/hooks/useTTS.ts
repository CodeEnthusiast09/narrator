import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTER_PAUSE, PARA_PAUSE } from '@/lib/sentences';

const CHAPTER_PAUSE_MS = 1500;
const PARA_PAUSE_MS = 350;

const MALE_HINTS = ['male', 'david', 'james', 'mark', 'daniel', 'guy', 'fred', 'alex', 'eric', 'george'];

function pickVoice(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (all.length === 0) return null;
  const local = all.filter((v) => v.localService);
  const pool = local.length > 0 ? local : all;
  const isMale = (v: SpeechSynthesisVoice) =>
    MALE_HINTS.some((h) => v.name.toLowerCase().includes(h));
  const isNgEn = (v: SpeechSynthesisVoice) =>
    v.lang.toLowerCase().replace('_', '-').startsWith('en-ng');
  const isEn = (v: SpeechSynthesisVoice) =>
    v.lang.toLowerCase().startsWith('en');
  // 1. en-NG male
  const ngMale = all.find((v) => isNgEn(v) && isMale(v));
  if (ngMale) return ngMale;
  // 2. any en-NG
  const ng = all.find((v) => isNgEn(v));
  if (ng) return ng;
  // 3. English male in local pool
  const localMale = pool.find((v) => isEn(v) && isMale(v));
  if (localMale) return localMale;
  // 4. English male in ALL voices (network voices count)
  const anyMale = all.find((v) => isEn(v) && isMale(v));
  if (anyMale) return anyMale;
  // 5. first local English voice
  const localEn = pool.find((v) => isEn(v));
  if (localEn) return localEn;
  // 6. first in preferred pool
  return pool[0];
}

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
      if (!r.current.voice) {
        const picked = pickVoice(all);
        if (picked) {
          r.current.voice = picked;
          setSelectedVoice(picked);
        }
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
      const picked = pickVoice(available);
      if (picked) {
        state.voice = picked;
        setSelectedVoice(picked);
        const local = available.filter((v) => v.localService);
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
