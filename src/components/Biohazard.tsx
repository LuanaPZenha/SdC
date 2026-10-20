"use client";

import { useId } from "react";

export function Biohazard({ className = "biohazard" }: { className?: string }) {
  const mask = `sdc-bio-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <defs>
        <mask id={mask}>
          <rect x="-100" y="-100" width="200" height="200" fill="black" />
          <g fill="white">
            <circle cx="0" cy="-34" r="48" />
            <circle cx="29.4" cy="17" r="48" />
            <circle cx="-29.4" cy="17" r="48" />
          </g>
          <g fill="black">
            <circle cx="0" cy="0" r="16" />
            <circle cx="0" cy="-55" r="19" />
            <circle cx="47.6" cy="27.5" r="19" />
            <circle cx="-47.6" cy="27.5" r="19" />
            <circle cx="0" cy="46" r="30" />
            <circle cx="39.8" cy="-23" r="30" />
            <circle cx="-39.8" cy="-23" r="30" />
          </g>
          <circle cx="0" cy="0" r="6.2" fill="white" />
          <circle cx="0" cy="0" r="11.5" fill="none" stroke="white" strokeWidth="3.2" />
        </mask>
      </defs>
      <rect x="-100" y="-100" width="200" height="200" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}
