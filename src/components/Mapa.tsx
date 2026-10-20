"use client";

import type { DistrictView } from "@/lib/types";
import { people } from "@/lib/format";

function heat(per10k: number): string {
  const amount = Math.max(0, Math.min(1, Math.log10(per10k + 1) / Math.log10(120)));
  const stops = [
    [217, 226, 206],
    [226, 186, 78],
    [194, 96, 42],
    [125, 39, 36],
    [54, 20, 28],
  ];
  const scaled = amount * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const mix = stops[index].map((channel, channelIndex) =>
    Math.round(channel + ((stops[index + 1]?.[channelIndex] ?? channel) - channel) * local),
  );
  return `rgb(${mix.join(",")})`;
}

export function Mapa({
  districts,
  selected,
  onSelect,
}: {
  districts: DistrictView[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <svg className="atlas" viewBox="0 0 960 560" role="img" aria-label="Placa esquemática de Maricá com oito recortes jogáveis">
      <rect width="960" height="560" fill="#d5e0cc" />
      <path d="M0 470 C 180 442, 360 500, 560 458 C 730 430, 860 470, 960 448 L960 560 L0 560 Z" fill="#1d4650" />
      <text x="790" y="530" fill="#d5e7ea" fontSize="14">
        Oceano Atlântico
      </text>
      <ellipse cx="300" cy="430" rx="150" ry="36" fill="#2f6f78" opacity="0.85" />
      <text x="248" y="434" fill="#e7f4f4" fontSize="12">
        Lagoa de Maricá
      </text>
      <path d="M80 120 H900 M140 300 H820" fill="none" stroke="#8d7344" strokeDasharray="7 6" strokeWidth="2" opacity="0.7" />
      <text x="70" y="28" fill="#5c6756" fontSize="12">
        RJ-106
      </text>
      {districts.map((district) => (
        <g
          key={district.id}
          className={district.id === selected ? "district selected" : "district"}
          onClick={() => onSelect(district.id)}
        >
          <path d={district.path} fill={heat(district.attackPer10k)} stroke="#f7f1e4" strokeWidth="2" />
          <text x={district.labelX} y={district.labelY} textAnchor="middle" fill={district.attackPer10k > 25 ? "#f7f1e4" : "#1c2418"}>
            <tspan x={district.labelX}>{district.name}</tspan>
            <tspan x={district.labelX} dy="15">
              {people(district.infected)} casos
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
