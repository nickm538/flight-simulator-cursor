/** World origin: KJFK ARP */
export const ORIGIN = {
  lat: 40.6399281,
  lon: -73.7786922,
  elevM: 4.0,
};

const R_EARTH = 6371000;
const LAT0 = (ORIGIN.lat * Math.PI) / 180;
const LON0 = (ORIGIN.lon * Math.PI) / 180;
const COS_LAT0 = Math.cos(LAT0);

export function latLonToWorld(lat: number, lon: number): { x: number; z: number } {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  const x = (λ - LON0) * COS_LAT0 * R_EARTH;
  const z = -(φ - LAT0) * R_EARTH;
  return { x, z };
}

export function worldToLatLon(x: number, z: number): { lat: number; lon: number } {
  const φ = LAT0 - z / R_EARTH;
  const λ = LON0 + x / (COS_LAT0 * R_EARTH);
  return { lat: (φ * 180) / Math.PI, lon: (λ * 180) / Math.PI };
}

export function dmmToDeg(degrees: number, minutes: number): number {
  return degrees + minutes / 60;
}

export function headingVector(trueHeadingDeg: number): { x: number; z: number } {
  const h = (trueHeadingDeg * Math.PI) / 180;
  return { x: Math.sin(h), z: -Math.cos(h) };
}

export function distance2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}
