import { ftToM, mToFt } from "./math";

const T0 = 288.15;
const P0 = 101325;
const RHO0 = 1.225;
const L = 0.0065;
const G = 9.80665;
const R = 287.05287;
const GAMMA = 1.4;

export interface Atmosphere {
  temperature: number;
  pressure: number;
  density: number;
  speedOfSound: number;
  theta: number;
  delta: number;
  sigma: number;
}

export function isa(altM: number, dIsa = 0, qnhPa = 101325): Atmosphere {
  const alt = Math.max(-500, altM);
  const trop = 11000;
  let T: number;
  let p: number;
  if (alt <= trop) {
    T = T0 - L * alt;
    p = P0 * Math.pow(T / T0, G / (L * R));
  } else {
    T = T0 - L * trop;
    const pTrop = P0 * Math.pow(T / T0, G / (L * R));
    p = pTrop * Math.exp((-G * (alt - trop)) / (R * T));
  }
  T += dIsa;
  p *= qnhPa / P0;
  const rho = p / (R * T);
  const a = Math.sqrt(GAMMA * R * T);
  return {
    temperature: T,
    pressure: p,
    density: rho,
    speedOfSound: a,
    theta: T / T0,
    delta: p / P0,
    sigma: rho / RHO0,
  };
}

export function tasToIas(tas: number, density: number): number {
  return tas * Math.sqrt(density / RHO0);
}

export function iasToTas(ias: number, density: number): number {
  return ias / Math.sqrt(Math.max(0.15, density / RHO0));
}

export function pressureAltitudeFt(pressurePa: number): number {
  return mToFt((T0 / L) * (1 - Math.pow(pressurePa / P0, (L * R) / G)));
}

export function densityAltitudeFt(altM: number, dIsa: number): number {
  const atm = isa(altM, dIsa);
  return mToFt((T0 / L) * (1 - Math.pow(atm.sigma, 0.234969)));
}

export function oatC(altM: number, dIsa = 0): number {
  return isa(altM, dIsa).temperature - 273.15;
}

export { RHO0, G, ftToM };
