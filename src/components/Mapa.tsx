"use client";

import { useEffect, useState } from "react";
import type { CarrierTrip, DistrictView, SupplyRun } from "@/lib/types";
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

const NUDGE: Record<string, { x: number; y: number }> = {
  centro: { x: 10, y: -30 },
  aracatiba: { x: 28, y: 10 },
  barra: { x: 6, y: 28 },
  "sao-jose": { x: -14, y: 6 },
};

function stopOf(id: string): { x: number; y: number; name: string } | null {
  const shape = REGION_SHAPES[id as keyof typeof REGION_SHAPES];
  if (!shape) return null;
  const shift = NUDGE[id] ?? { x: 0, y: 0 };
  return { x: shape.labelX + shift.x, y: shape.labelY + shift.y - 16, name: shape.name };
}

function routePath(from: { x: number; y: number }, to: { x: number; y: number }, bendSign = 1): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const bend = Math.min(42, length * 0.18) * bendSign;
  return `M ${from.x} ${from.y} Q ${midX + (-dy / length) * bend} ${midY + (dx / length) * bend} ${to.x} ${to.y}`;
}

function Bus({ trip, index, motion }: { trip: CarrierTrip; index: number; motion: boolean }) {
  const from = stopOf(trip.from);
  const to = stopOf(trip.to);
  if (!from || !to) return null;
  const pathId = `sdc-bus-${index}-${trip.from}-${trip.to}`;
  const duration = 3.6;
  const begin = index * 0.55;
  return (
    <g className="bus-run" pointerEvents="none">
      <title>{`Ônibus de ${from.name} para ${to.name}, ${trip.carried} ${trip.carried === 1 ? "pessoa contaminada" : "pessoas contaminadas"}`}</title>
      <path id={pathId} className="bus-route" d={routePath(from, to)} />
      <g>
        {motion ? (
          <animateMotion dur={`${duration}s`} begin={`${begin}s`} rotate="auto" fill="freeze" repeatCount="1">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        ) : (
          <animateMotion dur="0.01s" rotate="auto" fill="freeze" repeatCount="1">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        )}
        <g className="bus" transform="scale(1.85)">
          <rect className="bus-body" x={-11} y={-4.6} width={20} height={8.2} rx={1.5} />
          <path className="bus-roof" d="M-8 -4.6 H5.2 L7.2 -8.2 H-6.4 Z" />
          <rect className="bus-window" x={-6.2} y={-7.4} width={2.2} height={2.15} />
          <rect className="bus-window" x={-3.1} y={-7.4} width={2.2} height={2.15} />
          <rect className="bus-window" x={0} y={-7.4} width={2.2} height={2.15} />
          <circle className="bus-wheel" cx={-5.2} cy={3.9} r={1.75} />
          <circle className="bus-wheel" cx={5.4} cy={3.9} r={1.75} />
        </g>
      </g>
      <circle className="arrival" cx={to.x} cy={to.y} r={4} opacity={0}>
        {motion ? (
          <>
            <animate attributeName="r" from="3" to="18" dur="0.9s" begin={`${begin + duration}s`} fill="freeze" />
            <animate attributeName="opacity" from="0.95" to="0" dur="0.9s" begin={`${begin + duration}s`} fill="freeze" />
          </>
        ) : null}
      </circle>
    </g>
  );
}

function Ambulance({ run, index, motion }: { run: SupplyRun; index: number; motion: boolean }) {
  const from = stopOf(run.from);
  const to = stopOf(run.to);
  if (!from || !to) return null;
  const pathId = `sdc-ambulance-${index}-${run.from}-${run.to}`;
  const duration = 4;
  return (
    <g className="ambulance-run" pointerEvents="none">
      <title>{`Ambulância do ${run.originName} para ${run.phrase}`}</title>
      <path id={pathId} className="ambulance-route" d={routePath(from, to, -1)} />
      <g>
        {motion ? (
          <animateMotion dur={`${duration}s`} rotate="auto" fill="freeze" repeatCount="1">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        ) : (
          <animateMotion dur="0.01s" rotate="auto" fill="freeze" repeatCount="1">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        )}
        <g className="ambulance" transform="scale(1.85)">
          <rect className="ambulance-body" x={-12} y={-4.4} width={21} height={8} rx={1.4} />
          <path className="ambulance-cabin" d="M-4 -4.4 H6.5 L8.4 -8 H-2.4 Z" />
          <rect className="ambulance-window" x={-1.2} y={-7.3} width={2.4} height={2.2} />
          <rect className="ambulance-window" x={2} y={-7.3} width={2.4} height={2.2} />
          <rect className="ambulance-cross" x={-9.2} y={-2.5} width={1.5} height={4.2} />
          <rect className="ambulance-cross" x={-10.6} y={-1.15} width={4.3} height={1.5} />
          <circle className="ambulance-wheel" cx={-6} cy={3.8} r={1.7} />
          <circle className="ambulance-wheel" cx={5.6} cy={3.8} r={1.7} />
        </g>
      </g>
      <circle className="arrival-care" cx={to.x} cy={to.y} r={4} opacity={0}>
        {motion ? (
          <>
            <animate attributeName="r" from="3" to="18" dur="0.9s" begin={`${duration}s`} fill="freeze" />
            <animate attributeName="opacity" from="0.95" to="0" dur="0.9s" begin={`${duration}s`} fill="freeze" />
          </>
        ) : null}
      </circle>
    </g>
  );
}

export function Mapa({
  districts,
  selected,
  onSelect,
  trips = [],
  supplyRuns = [],
}: {
  districts: DistrictView[];
  selected: string;
  onSelect: (id: string) => void;
  trips?: CarrierTrip[];
  supplyRuns?: SupplyRun[];
}) {
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  const byId = new Map(districts.map((district) => [district.id, district]));
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
        const shift = NUDGE[id] ?? { x: 0, y: 0 };
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
      {trips.map((trip, index) => (
        <Bus key={`${trip.from}-${trip.to}-${index}`} trip={trip} index={index} motion={motion} />
      ))}
      {supplyRuns.map((run, index) => (
        <Ambulance key={`${run.to}-${run.destinationName}-${index}`} run={run} index={index} motion={motion} />
      ))}
      <text className="ocean-label" x={MAP_VIEW.width / 2} y={MAP_VIEW.height - 16} textAnchor="middle">
        OCEANO ATLÂNTICO
      </text>
    </svg>
  );
}
