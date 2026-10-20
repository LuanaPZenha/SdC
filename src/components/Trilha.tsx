"use client";

import { useEffect, useRef, useState } from "react";

const MUTE_KEY = "sdc-trilha";
const VOLUME_KEY = "sdc-trilha-volume";
const DEFAULT_VOLUME = 0.42;

function SomIcon({ muted, volume }: { muted: boolean; volume: number }) {
  const silent = muted || volume <= 0;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3.2 9.2h3.1L10.6 5.4v13.2L6.3 14.8H3.2z" />
      {silent ? (
        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4.4 4.6 19.2 19.4" />
      ) : (
        <>
          <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M14.2 9.1a3.5 3.5 0 0 1 0 5.8" />
          {volume >= 0.35 ? (
            <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M16.8 6.6a6.6 6.6 0 0 1 0 10.8" />
          ) : null}
        </>
      )}
    </svg>
  );
}

export function Trilha() {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [ready, setReady] = useState(false);
  const audible = on && volume > 0;

  useEffect(() => {
    if (window.localStorage.getItem(MUTE_KEY) === "off") setOn(false);
    const raw = window.localStorage.getItem(VOLUME_KEY);
    const stored = raw === null ? Number.NaN : Number(raw);
    if (Number.isFinite(stored) && stored >= 0 && stored <= 1) setVolume(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    const el = audio.current;
    if (!el || !ready) return;
    el.volume = volume;
    el.loop = true;

    const start = () => {
      if (!on || volume <= 0 || !el.paused) return;
      void el.play().catch(() => undefined);
    };

    if (!on || volume <= 0) el.pause();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [on, ready, volume]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (audible) {
      setOn(false);
      window.localStorage.setItem(MUTE_KEY, "off");
      el.pause();
      return;
    }
    const next = volume > 0 ? volume : DEFAULT_VOLUME;
    if (next !== volume) {
      setVolume(next);
      window.localStorage.setItem(VOLUME_KEY, String(next));
      el.volume = next;
    }
    setOn(true);
    window.localStorage.setItem(MUTE_KEY, "on");
    void el.play().catch(() => undefined);
  }

  function onVolume(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value) / 100;
    const el = audio.current;
    setVolume(next);
    window.localStorage.setItem(VOLUME_KEY, String(next));
    if (el) el.volume = next;
    if (next <= 0) {
      setOn(false);
      window.localStorage.setItem(MUTE_KEY, "off");
      el?.pause();
      return;
    }
    setOn(true);
    window.localStorage.setItem(MUTE_KEY, "on");
    if (el?.paused) void el.play().catch(() => undefined);
  }

  return (
    <div className="trilha-mount">
      <audio ref={audio} src="/trilha.mp3?v=3" loop preload="auto" playsInline />
      <div className={audible ? "trilha-dock on" : "trilha-dock"}>
        <button
          className="trilha"
          type="button"
          aria-pressed={audible}
          aria-label={audible ? "Silenciar a trilha" : "Ouvir a trilha"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={toggle}
        >
          <SomIcon muted={!on} volume={volume} />
        </button>
        <input
          className="trilha-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(volume * 100)}
          aria-label="Volume da trilha"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={onVolume}
        />
      </div>
    </div>
  );
}
