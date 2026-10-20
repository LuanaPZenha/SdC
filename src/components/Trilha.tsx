"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "sdc-trilha";
const VOLUME = 0.16;

export function Trilha() {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(KEY) === "off") setOn(false);
    setReady(true);
  }, []);

  useEffect(() => {
    const el = audio.current;
    if (!el || !ready) return;
    el.volume = VOLUME;
    el.loop = true;

    const start = () => {
      if (!on || !el.paused) return;
      void el.play().catch(() => undefined);
    };

    if (on) start();
    else el.pause();

    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [on, ready]);

  function toggle() {
    const next = !on;
    setOn(next);
    window.localStorage.setItem(KEY, next ? "on" : "off");
    const el = audio.current;
    if (!el) return;
    if (next) void el.play().catch(() => undefined);
    else el.pause();
  }

  return (
    <div className="trilha-mount">
      <audio ref={audio} src="/trilha.mp3" loop preload="auto" />
      <button
        className={on ? "trilha on" : "trilha"}
        type="button"
        aria-pressed={on}
        aria-label={on ? "Silenciar a trilha" : "Ouvir a trilha"}
        onClick={toggle}
      >
        {on ? "Som" : "Mudo"}
      </button>
    </div>
  );
}
