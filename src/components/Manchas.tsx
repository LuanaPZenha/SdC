"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const WINDOW_MS = 10_000;
const FADE_MS = 1700;

type Edge = "top" | "bottom" | "left" | "right";

type Stain = {
  id: string;
  edge: Edge;
  along: string;
  w: number;
  h: number;
  rot: number;
  enter: number;
  alpha: number;
  color: string;
  variant: 0 | 1 | 2;
};

const STAINS: Stain[] = [
  { id: "tl", edge: "top", along: "-2%", w: 270, h: 168, rot: -8, enter: 0, alpha: 0.5, color: "#6a1012", variant: 0 },
  { id: "t2", edge: "top", along: "16%", w: 220, h: 148, rot: 7, enter: 0.3, alpha: 0.38, color: "#4a0a0c", variant: 1 },
  { id: "t3", edge: "top", along: "39%", w: 246, h: 156, rot: -4, enter: 0.52, alpha: 0.44, color: "#7c1614", variant: 2 },
  { id: "t4", edge: "top", along: "61%", w: 200, h: 140, rot: 10, enter: 0.16, alpha: 0.36, color: "#5a0e10", variant: 0 },
  { id: "tr", edge: "top", along: "80%", w: 260, h: 164, rot: 5, enter: 0.66, alpha: 0.48, color: "#681012", variant: 1 },
  { id: "bl", edge: "bottom", along: "0%", w: 250, h: 162, rot: 6, enter: 0.22, alpha: 0.46, color: "#5c0c0e", variant: 2 },
  { id: "b2", edge: "bottom", along: "22%", w: 210, h: 146, rot: -8, enter: 0.48, alpha: 0.34, color: "#3e080a", variant: 0 },
  { id: "b3", edge: "bottom", along: "44%", w: 240, h: 158, rot: 3, enter: 0.08, alpha: 0.42, color: "#741412", variant: 1 },
  { id: "b4", edge: "bottom", along: "66%", w: 196, h: 142, rot: -5, enter: 0.6, alpha: 0.4, color: "#4e0c0e", variant: 2 },
  { id: "br", edge: "bottom", along: "82%", w: 236, h: 160, rot: 8, enter: 0.36, alpha: 0.44, color: "#601012", variant: 0 },
  { id: "l1", edge: "left", along: "16%", w: 168, h: 220, rot: -5, enter: 0.12, alpha: 0.42, color: "#641012", variant: 1 },
  { id: "l2", edge: "left", along: "44%", w: 154, h: 200, rot: 6, enter: 0.44, alpha: 0.32, color: "#3a080a", variant: 0 },
  { id: "l3", edge: "left", along: "70%", w: 162, h: 214, rot: 2, enter: 0.72, alpha: 0.46, color: "#701412", variant: 2 },
  { id: "r1", edge: "right", along: "8%", w: 160, h: 210, rot: 4, enter: 0.26, alpha: 0.38, color: "#560e10", variant: 0 },
  { id: "r2", edge: "right", along: "36%", w: 176, h: 230, rot: -6, enter: 0.56, alpha: 0.48, color: "#781614", variant: 1 },
  { id: "r3", edge: "right", along: "64%", w: 150, h: 196, rot: 3, enter: 0.38, alpha: 0.3, color: "#420a0c", variant: 2 },
];

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function place(stain: Stain): CSSProperties {
  const size = { width: stain.w, height: stain.h };
  if (stain.edge === "top") return { ...size, top: -48, left: stain.along, transformOrigin: "50% 0%" };
  if (stain.edge === "bottom") return { ...size, bottom: -52, left: stain.along, transformOrigin: "50% 100%" };
  if (stain.edge === "left") return { ...size, left: -44, top: stain.along, transformOrigin: "0% 50%" };
  return { ...size, right: -44, top: stain.along, transformOrigin: "100% 50%" };
}

function turn(edge: Edge) {
  if (edge === "bottom") return 180;
  if (edge === "left") return -90;
  if (edge === "right") return 90;
  return 0;
}

function Splatter({ variant }: { variant: 0 | 1 | 2 }) {
  if (variant === 1) {
    return (
      <svg viewBox="0 0 260 156" preserveAspectRatio="none" focusable="false">
        <path
          fill="currentColor"
          d="M34 68c16-30 52-36 78-26 20 8 30-12 54-8 30 4 52 22 64 44 10 18 26 14 28 30-2 20-26 22-38 34-16 14-22 26-46 24-20-2-28 10-48 4-24-6-34-26-54-22-18 4-36-8-44-26-8-18-24-16-24-34 0-12 14-16 30-20z"
        />
        <path fill="currentColor" opacity="0.8" d="M148 104c4 16-2 32 2 46 2 6 9 4 8-2-2-14 2-28-2-44-2-6-7-6-8 0z" />
        <circle cx="26" cy="72" r="7" fill="currentColor" opacity="0.55" />
        <circle cx="214" cy="62" r="5" fill="currentColor" opacity="0.45" />
        <circle cx="232" cy="90" r="3.5" fill="currentColor" opacity="0.4" />
        <circle cx="98" cy="26" r="4" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }
  if (variant === 2) {
    return (
      <svg viewBox="0 0 200 168" preserveAspectRatio="none" focusable="false">
        <ellipse cx="102" cy="68" rx="64" ry="36" fill="currentColor" opacity="0.9" />
        <ellipse cx="58" cy="86" rx="30" ry="20" fill="currentColor" opacity="0.75" />
        <ellipse cx="148" cy="78" rx="26" ry="18" fill="currentColor" opacity="0.7" />
        <path fill="currentColor" opacity="0.85" d="M96 100c2 16 0 28 4 40 2 6 8 4 7-2-2-14 2-24-2-38-2-5-7-5-9 0z" />
        <circle cx="32" cy="58" r="8" fill="currentColor" opacity="0.5" />
        <circle cx="20" cy="82" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="174" cy="50" r="6" fill="currentColor" opacity="0.48" />
        <circle cx="182" cy="76" r="3" fill="currentColor" opacity="0.35" />
        <circle cx="124" cy="36" r="5" fill="currentColor" opacity="0.42" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 180" preserveAspectRatio="none" focusable="false">
      <path
        fill="currentColor"
        d="M104 20c22-2 38 14 56 12 22-2 40 14 38 36-1 14 12 22 8 38-5 22-28 20-40 34-8 10-8 24-24 28-18 4-28-10-44-6-14 4-32-4-38-20-8-18-28-16-28-36 0-18 16-26 14-44-2-20 8-36 28-40 12-2 18-8 30-2z"
      />
      <path fill="currentColor" opacity="0.8" d="M86 118c2 16-4 30-1 42 2 6 8 5 8-2 1-14 6-24 4-40-2-4-9-4-11 0z" />
      <path fill="currentColor" opacity="0.7" d="M132 122c3 12 0 24 4 34 2 6 8 3 7-3-1-12 2-22-2-32-3-5-8-4-9 1z" />
      <circle cx="46" cy="48" r="7" fill="currentColor" opacity="0.5" />
      <circle cx="170" cy="56" r="5" fill="currentColor" opacity="0.45" />
      <circle cx="36" cy="90" r="3.5" fill="currentColor" opacity="0.4" />
      <circle cx="186" cy="96" r="4" fill="currentColor" opacity="0.38" />
    </svg>
  );
}

export function Manchas({ remainingMs }: { remainingMs: number | null }) {
  const active = remainingMs !== null && remainingMs <= WINDOW_MS;
  const held = useRef(0);
  if (active && remainingMs !== null) {
    const linear = 1 - remainingMs / WINDOW_MS;
    held.current = Math.min(1, 0.08 + linear * 0.92);
  }
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const alive = useRef(false);

  useEffect(() => {
    if (active) {
      alive.current = true;
      setFading(false);
      setMounted(true);
      return;
    }
    if (!alive.current) return;
    setFading(true);
    const timer = window.setTimeout(() => {
      alive.current = false;
      setMounted(false);
      setFading(false);
    }, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!mounted) return null;

  const level = held.current;

  return (
    <div className={fading ? "manchas out" : "manchas"} aria-hidden="true">
      <div className="manchas-wash" style={{ opacity: level }} />
      {STAINS.map((stain) => {
        const shown = smooth((level - stain.enter) / 0.32);
        const swell = smooth((level - stain.enter) / Math.max(0.22, 1 - stain.enter));
        return (
          <span
            key={stain.id}
            className="mancha"
            style={{
              ...place(stain),
              color: stain.color,
              opacity: shown * stain.alpha,
              transform: `scale(${0.36 + swell * 0.78})`,
            }}
          >
            <span className="mancha-spin" style={{ transform: `rotate(${turn(stain.edge) + stain.rot}deg)` }}>
              <Splatter variant={stain.variant} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
