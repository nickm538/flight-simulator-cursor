import { latLonToWorld } from "../util/geo";
import { fbm2, pointInPolygon } from "../util/math";
import { AIRPORTS, WORLD } from "../aircraft/constants";
import { distance2 } from "../util/geo";

const manhattan: number[][] = [
  [-74.019, 40.7],
  [-74.005, 40.701],
  [-73.999, 40.708],
  [-73.975, 40.711],
  [-73.972, 40.735],
  [-73.967, 40.752],
  [-73.958, 40.76],
  [-73.94, 40.78],
  [-73.927, 40.8],
  [-73.917, 40.83],
  [-73.91, 40.872],
  [-73.926, 40.878],
  [-73.933, 40.85],
  [-73.947, 40.828],
  [-73.958, 40.82],
  [-73.975, 40.79],
  [-74.01, 40.755],
  [-74.02, 40.72],
].map(([lon, lat]) => {
  const p = latLonToWorld(lat, lon);
  return [p.x, p.z];
});

const longIsland: number[][] = [
  [-74.02, 40.64],
  [-74.0, 40.57],
  [-73.95, 40.55],
  [-73.85, 40.56],
  [-73.75, 40.58],
  [-73.6, 40.58],
  [-73.4, 40.6],
  [-73.2, 40.7],
  [-73.0, 40.78],
  [-72.9, 40.9],
  [-73.1, 40.96],
  [-73.4, 40.9],
  [-73.7, 40.86],
  [-73.9, 40.8],
  [-73.95, 40.75],
  [-73.98, 40.7],
  [-74.0, 40.66],
].map(([lon, lat]) => {
  const p = latLonToWorld(lat, lon);
  return [p.x, p.z];
});

const staten: number[][] = [
  [-74.25, 40.5],
  [-74.05, 40.5],
  [-74.05, 40.65],
  [-74.26, 40.65],
].map(([lon, lat]) => {
  const p = latLonToWorld(lat, lon);
  return [p.x, p.z];
});

const jersey: number[][] = [
  [-74.35, 40.45],
  [-74.05, 40.45],
  [-74.02, 40.7],
  [-73.97, 40.88],
  [-74.05, 41.05],
  [-74.4, 41.05],
  [-74.4, 40.5],
].map(([lon, lat]) => {
  const p = latLonToWorld(lat, lon);
  return [p.x, p.z];
});

const bronx: number[][] = [
  [-73.93, 40.8],
  [-73.88, 40.8],
  [-73.78, 40.86],
  [-73.78, 40.92],
  [-73.93, 40.92],
].map(([lon, lat]) => {
  const p = latLonToWorld(lat, lon);
  return [p.x, p.z];
});

const airportPads = AIRPORTS.map((a) => {
  const p = latLonToWorld(a.lat, a.lon);
  return { x: p.x, z: p.z, r: a.icao === "KJFK" ? 4200 : 2800, elev: a.elevM };
});

export function isLand(x: number, z: number): boolean {
  for (const a of airportPads) {
    if (distance2(x, z, a.x, a.z) < a.r) return true;
  }
  if (pointInPolygon(x, z, manhattan)) return true;
  if (pointInPolygon(x, z, longIsland)) return true;
  if (pointInPolygon(x, z, staten)) return true;
  if (pointInPolygon(x, z, jersey)) return true;
  if (pointInPolygon(x, z, bronx)) return true;
  return false;
}

export function isManhattan(x: number, z: number): boolean {
  return pointInPolygon(x, z, manhattan);
}

export function elevationAt(x: number, z: number): number {
  for (const a of airportPads) {
    if (distance2(x, z, a.x, a.z) < a.r) {
      const t = distance2(x, z, a.x, a.z) / a.r;
      return a.elev + t * 0.4;
    }
  }
  if (!isLand(x, z)) return -2.5;
  let h = 3.5 + fbm2(x * 0.00008, z * 0.00008, 5) * 18;
  if (isManhattan(x, z)) h = 6 + fbm2(x * 0.0002, z * 0.0002, 3) * 8;
  if (x < -22000) h += 12 + fbm2(x * 0.00015, z * 0.00015, 4) * 40;
  return h;
}

export function inWorld(x: number, z: number): boolean {
  const h = WORLD.sizeM / 2;
  return Math.abs(x) < h && Math.abs(z) < h;
}

export { manhattan };
