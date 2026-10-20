function gear(cx: number, cy: number, rOut: number, rIn: number, rHole: number, teeth = 8) {
  let d = "";
  for (let i = 0; i < teeth; i += 1) {
    const base = (i / teeth) * Math.PI * 2 - Math.PI / 2;
    const step = (Math.PI * 2) / teeth;
    const point = (angle: number, radius: number) =>
      `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
    d += `${i === 0 ? "M" : "L"}${point(base + step * 0.08, rIn)}`;
    d += ` L${point(base + step * 0.28, rOut)}`;
    d += ` L${point(base + step * 0.72, rOut)}`;
    d += ` L${point(base + step * 0.92, rIn)}`;
  }
  d += ` Z M${cx + rHole} ${cy} a${rHole} ${rHole} 0 1 0 ${-rHole * 2} 0 a${rHole} ${rHole} 0 1 0 ${rHole * 2} 0 Z`;
  return d;
}

export function SalaIcon() {
  return (
    <svg className="tab-icon tab-icon-map" viewBox="0 0 200 112" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10 30 L22 22 L38 16 L54 16 L64 22 L72 24 L68 34 L74 42 L66 52 L58 62 L52 58 L46 66 L38 64 L34 54 L30 46 L36 36 L24 34 L14 36 Z M76 12 L90 10 L96 18 L90 28 L78 24 L72 16 Z M52 70 L62 66 L74 74 L80 90 L76 106 L66 110 L56 100 L50 86 L48 74 Z M98 30 L108 20 L118 18 L124 26 L120 36 L108 40 L98 34 Z M96 42 L112 38 L126 46 L132 60 L126 78 L114 92 L102 90 L94 76 L90 60 L94 48 Z M118 22 L146 14 L176 16 L194 28 L196 40 L180 44 L168 56 L156 50 L146 60 L136 52 L128 40 L120 34 Z M150 50 L160 52 L164 66 L154 70 L146 58 Z M168 74 L184 70 L196 78 L194 90 L178 92 L166 82 Z M128 80 L132 78 L134 86 L130 88 Z"
      />
    </svg>
  );
}

export function GestaoIcon() {
  return (
    <svg className="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="7" y="12" width="34" height="46" rx="3.5" fill="none" stroke="currentColor" strokeWidth="3" />
      <path fill="currentColor" d="M16 6h14a3 3 0 0 1 3 3v5H13V9a3 3 0 0 1 3-3z" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <rect x="12" y="20" width="7.5" height="7.5" rx="1" />
        <path d="M13.4 23.7l1.8 1.8 3.4-3.6" />
        <path d="M23.5 23.8h13" />
        <rect x="12" y="32" width="7.5" height="7.5" rx="1" />
        <path d="M13.4 35.7l1.8 1.8 3.4-3.6" />
        <path d="M23.5 35.8h13" />
        <rect x="12" y="44" width="7.5" height="7.5" rx="1" />
        <path d="M13.4 47.7l1.8 1.8 3.4-3.6" />
        <path d="M23.5 47.8h10" />
      </g>
      <path fill="currentColor" fillRule="evenodd" d={gear(47, 46, 14, 10.4, 4.6)} />
    </svg>
  );
}

export function NewsIcon() {
  return (
    <svg className="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        d="M14 8h36a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H18c-3 0-6 2-8 4V12a4 4 0 0 1 4-4z"
      />
      <path fill="currentColor" d="M16 13h34v14H16z" />
      <text x="33" y="23.5" textAnchor="middle" fill="#14120f" fontFamily="Arial Black, Impact, sans-serif" fontSize="11" fontWeight="700">
        NEWS
      </text>
      <path fill="currentColor" d="M18 27h12v12H18z M33 28h15v2.4H33z M33 33h15v2.4H33z M33 38h11v2.4H33z M18 43h30v2.4H18z M18 49h24v2.4H18z" />
    </svg>
  );
}
