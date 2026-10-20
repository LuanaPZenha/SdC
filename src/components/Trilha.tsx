"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "sdc-trilha";
const VOLUME = 0.42;

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

    if (!on) el.pause();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [on, ready]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) {
      setOn(false);
      window.localStorage.setItem(KEY, "off");
      el.pause();
      return;
    }
    setOn(true);
    window.localStorage.setItem(KEY, "on");
    void el.play().catch(() => undefined);
  }

  return (
    <div className="trilha-mount">
      <audio ref={audio} src="/trilha.mp3?v=2" loop preload="auto" playsInline />
      <button
        className={on ? "trilha on" : "trilha"}
        type="button"
        aria-pressed={on}
        aria-label={on ? "Silenciar a trilha" : "Ouvir a trilha"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={toggle}
      >
        {on ? "Som" : "Mudo"}
      </button>
    </div>
  );
}
