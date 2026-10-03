export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function wrap360(degValue: number): number {
  let d = degValue % 360;
  if (d < 0) d += 360;
  return d;
}

export function wrap180(degValue: number): number {
  let d = wrap360(degValue);
  if (d > 180) d -= 360;
  return d;
}

export function saturate(v: number): number {
  return clamp(v, 0, 1);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function ktToMs(kt: number): number {
  return kt * 0.514444;
}

export function msToKt(ms: number): number {
  return ms / 0.514444;
}

export function mToFt(m: number): number {
  return m * 3.28084;
}

export function ftToM(ft: number): number {
  return ft / 3.28084;
}

export function mpsToFpm(ms: number): number {
  return ms * 196.8504;
}

/** Aviation heading (0 = north, clockwise) to Three.js Y rotation for a +Z-forward mesh. */
export function headingToYaw(headingRad: number): number {
  return -headingRad;
}

export function yawToHeading(yaw: number): number {
  return wrap360(deg(-yaw));
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function valueNoise2(x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sz);
}

export function fbm2(x: number, z: number, octaves = 4): number {
  let n = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    n += amp * valueNoise2(x * freq, z * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return n;
}

export function pointInPolygon(x: number, z: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
