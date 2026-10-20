"use client";

import type { DistrictView } from "@/lib/types";
import { people } from "@/lib/format";
import { LAGOON_PATH, MAP_VIEW, MUNICIPALITY_PATH, NEIGHBOR_LANDS, REGION_SHAPES } from "@/content/geography";

function heat(per10k: number): string {
  const amount = Math.max(0, Math.min(1, Math.log10(per10k + 1) / Math.log10(90)));
  const stops = [
    [118, 128, 86],
    [196, 168, 78],
    [214, 104, 42],
    [186, 36, 32],
    [92, 16, 24],
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
  const byId = new Map(districts.map((district) => [district.id, district]));
  const nudge: Record<string, { x: number; y: number }> = {
    centro: { x: 10, y: -30 },
    aracatiba: { x: 28, y: 10 },
    barra: { x: 6, y: 28 },
    "sao-jose": { x: -14, y: 6 },
  };
  const outside: Record<string, { x: number; y: number } | null> = {
    Niterói: { x: 40, y: 270 },
    "São Gonçalo": { x: 126, y: 62 },
    Itaboraí: { x: 748, y: 32 },
    Tanguá: { x: 948, y: 38 },
    "Rio Bonito": null,
    Saquarema: { x: 1030, y: 196 },
  };

  return (
    <svg
      className="atlas"
      viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`}
      role="img"
      aria-label="Mapa do município de Maricá, com o contorno do IBGE e os recortes clicáveis"
    >
      <defs>
        <radialGradient id="sdc-ocean" cx="48%" cy="46%" r="72%">
          <stop offset="0%" stopColor="#1a3d56" />
          <stop offset="48%" stopColor="#0d2233" />
          <stop offset="100%" stopColor="#071018" />
        </radialGradient>
        <clipPath id="sdc-marica">
          <path d={MUNICIPALITY_PATH} />
        </clipPath>
      </defs>
      <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#sdc-ocean)" />
      {NEIGHBOR_LANDS.map((land) => (
        <path key={land.name} d={land.path} className="neighbor-land" />
      ))}
      <g clipPath="url(#sdc-marica)">
        <path d={MUNICIPALITY_PATH} fill="#5e6b48" />
        {(Object.keys(REGION_SHAPES) as Array<keyof typeof REGION_SHAPES>).map((id) => {
          const shape = REGION_SHAPES[id];
          const district = byId.get(id);
          if (!district) return null;
          return (
            <path
              key={id}
              d={shape.path}
              fill={heat(district.attackPer10k)}
              className={id === selected ? "region selected" : "region"}
              onClick={() => onSelect(id)}
            />
          );
        })}
        <path d={LAGOON_PATH} className="lagoon" />
      </g>
      <path d={MUNICIPALITY_PATH} className="shore" />
      {NEIGHBOR_LANDS.map((land) => {
        const place = outside[land.name];
        if (!place) return null;
        return (
          <text key={land.name} className="neighbor-label" x={place.x} y={place.y} textAnchor="middle">
            {land.name}
          </text>
        );
      })}
      {(Object.keys(REGION_SHAPES) as Array<keyof typeof REGION_SHAPES>).map((id) => {
        const shape = REGION_SHAPES[id];
        const district = byId.get(id);
        if (!district) return null;
        const shift = nudge[id] ?? { x: 0, y: 0 };
        const x = shape.labelX + shift.x;
        const y = shape.labelY + shift.y;
        const compact = id === "aracatiba" || id === "barra";
        return (
          <g key={id} className="map-label" pointerEvents="none">
            <circle className="city-dot" cx={x} cy={y - (compact ? 12 : 16)} r="3.2" />
            <text x={x} y={y} textAnchor="middle">
              <tspan x={x}>{shape.name}</tspan>
              {compact ? null : (
                <tspan className="map-count" x={x} dy="13">
                  {people(district.infected)}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
      <text className="ocean-label" x={MAP_VIEW.width / 2} y={MAP_VIEW.height - 16} textAnchor="middle">
        OCEANO ATLÂNTICO
      </text>
    </svg>
  );
}
