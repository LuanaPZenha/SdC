import fs from "node:fs";
import path from "node:path";

const temp = path.join(process.env.TEMP, "sdc-geo");
const read = (name) => JSON.parse(fs.readFileSync(path.join(temp, name), "utf8"));

const GROUPS = {
  itaipuacu: [8517760, 8517752, 8517759, 8517750, 8517751, 8517749, 8517748, 8517747, 8517746, 8517758],
  inoa: [8517754, 8517753, 8517757, 8517756, 8517755, 8517743],
  "sao-jose": [8517744, 8517721],
  centro: [8517718, 8517717, 8517719, 8517720, 8517722, 8517723, 8517715, 8517716, 8517737, 8517739, 8517741, 8517742, 8517740, 8517738, 8517736],
  aracatiba: [8517726, 8517725],
  barra: [8517728, 8517727, 8517745],
  cordeirinho: [8517730, 8517729, 8517711, 8517724, 8517713, 8517714, 8517712],
  "ponta-negra": [8517731, 8517732, 8517733, 8517734, 8517735],
};

const LABELS = {
  inoa: { name: "Inoã", lon: -42.93, lat: -22.914 },
  "sao-jose": { name: "São José", lon: -42.884, lat: -22.93 },
  centro: { name: "Centro", lon: -42.819, lat: -22.917 },
  aracatiba: { name: "Araçatiba", lon: -42.821, lat: -22.935 },
  barra: { name: "Barra", lon: -42.82, lat: -22.955 },
  itaipuacu: { name: "Itaipuaçu", lon: -42.99, lat: -22.962 },
  cordeirinho: { name: "Cordeirinho", lon: -42.748, lat: -22.952 },
  "ponta-negra": { name: "Ponta Negra", lon: -42.695, lat: -22.948 },
};

const ORDER = ["itaipuacu", "inoa", "sao-jose", "centro", "aracatiba", "barra", "cordeirinho", "ponta-negra"];

function dist2(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function shapeFromGeometry(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => ({ outer: [polygon[0]], inner: polygon.slice(1) }));
}

function ringArea(ring) {
  let sum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const next = ring[(index + 1) % ring.length];
    sum += ring[index][0] * next[1] - next[0] * ring[index][1];
  }
  return sum / 2;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const xi = ring[index][0];
    const yi = ring[index][1];
    const xj = ring[previous][0];
    const yj = ring[previous][1];
    const hit = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + 0.0) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function pointInShape(point, shape) {
  const inOuter = shape.outer.some((ring) => pointInRing(point, ring));
  if (!inOuter) return false;
  return !shape.inner.some((ring) => pointInRing(point, ring));
}

function collectPolygons(featureCollection) {
  const polygons = [];
  const visit = (geometry) => {
    if (!geometry) return;
    if (geometry.type === "Polygon") polygons.push(geometry.coordinates);
    else if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygons.push(polygon));
    else if (geometry.type === "Feature") visit(geometry.geometry);
    else if (geometry.type === "FeatureCollection") geometry.features.forEach((feature) => visit(feature.geometry));
  };
  visit(featureCollection);
  return polygons;
}

function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const sq = tolerance * tolerance;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let best = -1;
    let bestDist = 0;
    const ax = points[start][0];
    const ay = points[start][1];
    const bx = points[end][0];
    const by = points[end][1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    for (let index = start + 1; index < end; index += 1) {
      const px = points[index][0];
      const py = points[index][1];
      const t = ((px - ax) * dx + (py - ay) * dy) / len;
      const qx = ax + dx * t;
      const qy = ay + dy * t;
      const distance = (px - qx) ** 2 + (py - qy) ** 2;
      if (distance > bestDist) {
        bestDist = distance;
        best = index;
      }
    }
    if (bestDist > sq && best >= 0) {
      keep[best] = true;
      stack.push([start, best], [best, end]);
    }
  }
  const next = points.filter((_, index) => keep[index]);
  return next.length >= 4 ? next : points;
}

const bairros = read("bairros.json");
const byId = new Map();
for (const feature of bairros.features ?? []) byId.set(feature.properties.osm_id, feature);

const shapes = [];
for (const id of ORDER) {
  for (const relationId of GROUPS[id]) {
    const feature = byId.get(relationId);
    if (!feature) {
      console.error("missing", relationId);
      continue;
    }
    for (const shape of shapeFromGeometry(feature.geometry)) {
      shapes.push({ id, shape, name: feature.properties.name });
    }
  }
}

const municipality = collectPolygons(read("marica-max.json")).map((polygon) => ({
  outer: [polygon[0]],
  inner: polygon.slice(1),
}));

const lat0 = -22.93;
const cos = Math.cos((lat0 * Math.PI) / 180);
const project = (lon, lat) => [lon * cos, -lat];
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const shape of municipality) {
  for (const ring of shape.outer) {
    for (const [lon, lat] of ring) {
      const [x, y] = project(lon, lat);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}
const padX = (maxX - minX) * 0.08;
const padY = (maxY - minY) * 0.16;
minX -= padX;
maxX += padX;
minY -= padY * 0.45;
maxY += padY;
const width = 1080;
const height = Math.round(width * ((maxY - minY) / (maxX - minX)));
const sx = width / (maxX - minX);
const sy = height / (maxY - minY);
const toSvg = (lon, lat) => {
  const [x, y] = project(lon, lat);
  return [(x - minX) * sx, (y - minY) * sy];
};

const cols = 980;
const rows = Math.round(cols * ((maxY - minY) / (maxX - minX)));
const lonOf = (col) => {
  const x = minX + ((col + 0.5) / cols) * (maxX - minX);
  return x / cos;
};
const latOf = (row) => {
  const y = minY + ((row + 0.5) / rows) * (maxY - minY);
  return -y;
};

const land = new Uint8Array(cols * rows);
const owner = new Int16Array(cols * rows);
owner.fill(-1);
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    const point = [lonOf(col), latOf(row)];
    if (municipality.some((shape) => pointInShape(point, shape))) land[row * cols + col] = 1;
  }
}

const regionIndex = new Map(ORDER.map((id, index) => [id, index]));
for (const item of shapes) {
  const index = regionIndex.get(item.id);
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const ring of item.shape.outer) {
    for (const [lon, lat] of ring) {
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  const c0 = Math.max(0, Math.floor(((west * cos - minX) / (maxX - minX)) * cols) - 2);
  const c1 = Math.min(cols - 1, Math.ceil(((east * cos - minX) / (maxX - minX)) * cols) + 2);
  const r0 = Math.max(0, Math.floor(((-north - minY) / (maxY - minY)) * rows) - 2);
  const r1 = Math.min(rows - 1, Math.ceil(((-south - minY) / (maxY - minY)) * rows) + 2);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const slot = row * cols + col;
      if (!land[slot] || owner[slot] !== -1) continue;
      if (pointInShape([lonOf(col), latOf(row)], item.shape)) owner[slot] = index;
    }
  }
}

const queue = [];
for (let slot = 0; slot < owner.length; slot += 1) {
  if (land[slot] && owner[slot] !== -1) queue.push(slot);
}
for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const slot = queue[cursor];
  const row = Math.floor(slot / cols);
  const col = slot % cols;
  const value = owner[slot];
  const neighbors = [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ];
  for (const [nextCol, nextRow] of neighbors) {
    if (nextCol < 0 || nextRow < 0 || nextCol >= cols || nextRow >= rows) continue;
    const next = nextRow * cols + nextCol;
    if (!land[next] || owner[next] !== -1) continue;
    owner[next] = value;
    queue.push(next);
  }
}

const touches = ORDER.map(() => new Set());
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    const value = owner[row * cols + col];
    if (value < 0) continue;
    if (col + 1 < cols) {
      const other = owner[row * cols + col + 1];
      if (other >= 0 && other !== value) {
        touches[value].add(ORDER[other]);
        touches[other].add(ORDER[value]);
      }
    }
    if (row + 1 < rows) {
      const other = owner[(row + 1) * cols + col];
      if (other >= 0 && other !== value) {
        touches[value].add(ORDER[other]);
        touches[other].add(ORDER[value]);
      }
    }
  }
}

function contour(index) {
  const mask = new Uint8Array((cols + 2) * (rows + 2));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (owner[row * cols + col] === index) mask[(row + 1) * (cols + 2) + (col + 1)] = 1;
    }
  }
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      if (!mask[row * (cols + 2) + col]) continue;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (!mask[(row + dr) * (cols + 2) + (col + dc)]) mask[row * (cols + 2) + col] = 2;
      }
    }
  }
  const dilated = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mask[(row + 1) * (cols + 2) + (col + 1)]) dilated[row * cols + col] = 1;
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (dilated[row * cols + col]) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const rr = row + dr;
          const cc = col + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
          if (owner[rr * cols + cc] === index) near = true;
        }
      }
      if (near) dilated[row * cols + col] = 1;
    }
  }

  const segments = new Map();
  const add = (ax, ay, bx, by) => {
    const key = `${ax},${ay}`;
    const list = segments.get(key) ?? [];
    list.push([bx, by]);
    segments.set(key, list);
  };
  const on = (col, row) => col >= 0 && row >= 0 && col < cols && row < rows && dilated[row * cols + col];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!on(col, row)) continue;
      if (!on(col, row - 1)) add(col, row, col + 1, row);
      if (!on(col, row + 1)) add(col + 1, row + 1, col, row + 1);
      if (!on(col - 1, row)) add(col, row + 1, col, row);
      if (!on(col + 1, row)) add(col + 1, row, col + 1, row + 1);
    }
  }
  const rings = [];
  const used = new Set();
  for (const [startKey, nexts] of segments) {
    for (const next of nexts) {
      const marker = `${startKey}>${next[0]},${next[1]}`;
      if (used.has(marker)) continue;
      const [sx0, sy0] = startKey.split(",").map(Number);
      const ring = [[sx0, sy0]];
      let cx = next[0];
      let cy = next[1];
      used.add(marker);
      let guard = 0;
      while (guard++ < 200000 && (cx !== sx0 || cy !== sy0)) {
        ring.push([cx, cy]);
        const options = segments.get(`${cx},${cy}`) ?? [];
        let moved = false;
        for (const option of options) {
          const step = `${cx},${cy}>${option[0]},${option[1]}`;
          if (used.has(step)) continue;
          used.add(step);
          cx = option[0];
          cy = option[1];
          moved = true;
          break;
        }
        if (!moved) break;
      }
      if (ring.length > 12) rings.push(ring);
    }
  }
  return rings
    .map((ring) => {
      const geo = ring.map(([col, row]) => {
        const lon = (minX + (col / cols) * (maxX - minX)) / cos;
        const lat = -(minY + (row / rows) * (maxY - minY));
        return toSvg(lon, lat);
      });
      const closed = simplify(geo, 1.35);
      if (dist2(closed[0], closed[closed.length - 1]) > 0.01) closed.push(closed[0]);
      return closed;
    })
    .filter((ring) => Math.abs(ringArea(ring)) > 18);
}

function pathFromRings(rings) {
  return rings
    .map((ring) => ring.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join("") + "Z")
    .join("");
}

const regions = {};
for (const id of ORDER) {
  const rings = contour(regionIndex.get(id)).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
  let label = toSvg(LABELS[id].lon, LABELS[id].lat);
  const col = Math.round(((label[0] / width) * cols));
  const row = Math.round(((label[1] / height) * rows));
  const slot = row * cols + col;
  if (owner[slot] !== regionIndex.get(id)) {
    let best = null;
    let bestDist = Infinity;
    for (let index = 0; index < owner.length; index += 1) {
      if (owner[index] !== regionIndex.get(id)) continue;
      const rr = Math.floor(index / cols);
      const cc = index % cols;
      const distance = (cc - col) ** 2 + (rr - row) ** 2;
      if (distance < bestDist) {
        bestDist = distance;
        best = [cc, rr];
      }
    }
    if (best) label = [(best[0] / cols) * width, (best[1] / rows) * height];
  }
  regions[id] = {
    name: LABELS[id].name,
    path: pathFromRings(rings.slice(0, 3)),
    labelX: Number(label[0].toFixed(1)),
    labelY: Number(label[1].toFixed(1)),
    neighbors: [...touches[regionIndex.get(id)]].sort(),
  };
  console.log(id, "rings", rings.length, "neighbors", regions[id].neighbors.join(","));
}

function svgPath(polygons) {
  const commands = [];
  for (const polygon of polygons) {
    polygon.forEach((ring) => {
      const simplified = simplify(ring.map(([lon, lat]) => toSvg(lon, lat)), 0.8);
      commands.push(simplified.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join("") + "Z");
    });
  }
  return commands.join("");
}

const city = svgPath(collectPolygons(read("marica-max.json")));
const lagoons = ["lagoon-marica.json", "lagoon-guarapina.json", "lagoon-barra.json"].map((file) => svgPath(collectPolygons(read(file)))).join("");
const neighbors = [
  ["Niterói", "niteroi-i.json"],
  ["São Gonçalo", "sg-i.json"],
  ["Itaboraí", "itaborai-i.json"],
  ["Tanguá", "tangua-i.json"],
  ["Rio Bonito", "riobonito-i.json"],
  ["Saquarema", "saquarema-i.json"],
].map(([name, file]) => {
  const polygons = collectPolygons(read(file));
  const cityX = width * 0.5;
  const cityY = height * 0.58;
  let label = null;
  let score = -1;
  for (const polygon of polygons) {
    for (const [lon, lat] of polygon[0]) {
      const point = toSvg(lon, lat);
      if (point[0] < 28 || point[1] < 22 || point[0] > width - 28 || point[1] > height - 22) continue;
      const distance = (point[0] - cityX) ** 2 + (point[1] - cityY) ** 2;
      if (distance > score) {
        score = distance;
        label = point;
      }
    }
  }
  return {
    name,
    path: svgPath(polygons),
    labelX: label ? Number(label[0].toFixed(1)) : null,
    labelY: label ? Number(label[1].toFixed(1)) : null,
  };
});

const output = `/* Gerado por scripts/build-map.mjs a partir da malha IBGE do município 3302700 e dos limites de bairro do OpenStreetMap. */
export const MAP_VIEW = { width: ${width}, height: ${height} };

export const MUNICIPALITY_PATH = ${JSON.stringify(city)};

export const LAGOON_PATH = ${JSON.stringify(lagoons)};

export const NEIGHBOR_LANDS = ${JSON.stringify(neighbors, null, 2)} as const;

export const REGION_SHAPES = ${JSON.stringify(regions, null, 2)} as const;
`;

fs.writeFileSync(path.join("src", "content", "geography.ts"), output);
console.log("view", width, height);
