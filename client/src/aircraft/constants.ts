import { dmmToDeg, latLonToWorld } from "../util/geo";

/** Magnetic variation, west positive (NY area ~13W). mag = true + MAG_VAR_WEST */
export const MAG_VAR_WEST = 13;

export const B738 = {
  name: "Boeing 737-800",
  icao: "B738",
  length: 39.47,
  wingspan: 35.79,
  height: 12.55,
  fuselageRadius: 1.88,
  wingArea: 124.6,
  wingChord: 3.87,
  wingSweepDeg: 25.0,
  dihedralDeg: 6.0,
  emptyMass: 41413,
  mtow: 79016,
  typicalMass: 65000,
  fuelCapacityKg: 20894,
  maxThrustN: 2 * 117000,
  engineOffsetY: -2.15,
  engineOffsetX: 5.85,
  engineOffsetZ: 2.4,
  cgToNose: 16.6,
  noseGearZ: 12.85,
  mainGearZ: -1.55,
  mainGearX: 2.65,
  gearRestLength: 2.55,
  wheelRadius: 0.56,
  noseWheelRadius: 0.34,
  Ixx: 980000,
  Iyy: 2.65e6,
  Izz: 3.35e6,
  Ixz: 85000,
  vmoKt: 340,
  mmo: 0.82,
  ceilingFt: 41000,
  fanBlades: 24,
};

export const FLAP_DETENTS = [0, 1, 5, 10, 15, 25, 30, 40] as const;
export type FlapDetent = (typeof FLAP_DETENTS)[number];

export interface RunwayDef {
  id: string;
  mag: string;
  trueHeading: number;
  lat: number;
  lon: number;
  elevM: number;
  lengthM: number;
  widthM: number;
  displacedM: number;
  ils?: { freq: string; gsDeg: number; ident: string };
}

export interface AirportDef {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  elevM: number;
  magVar: number;
  frequencies: {
    atis: string;
    clearance: string;
    ground: string;
    tower: string;
    departure: string;
    approach: string;
  };
  runways: RunwayDef[];
  terminals: { name: string; lat: number; lon: number; heading: number; gates: number }[];
}

function rw(
  id: string,
  mag: string,
  trueHeading: number,
  latD: number,
  latM: number,
  lonD: number,
  lonM: number,
  elevFt: number,
  lengthM: number,
  widthM: number,
  displacedM: number,
  ils?: RunwayDef["ils"],
): RunwayDef {
  return {
    id,
    mag,
    trueHeading,
    lat: dmmToDeg(latD, latM),
    lon: -dmmToDeg(lonD, lonM),
    elevM: elevFt * 0.3048,
    lengthM,
    widthM,
    displacedM,
    ils,
  };
}

export const AIRPORTS: AirportDef[] = [
  {
    icao: "KJFK",
    name: "John F Kennedy International",
    lat: 40.6399281,
    lon: -73.7786922,
    elevM: 4.0,
    magVar: 13,
    frequencies: {
      atis: "128.725",
      clearance: "135.05",
      ground: "121.90",
      tower: "123.90",
      departure: "135.90",
      approach: "125.70",
    },
    runways: [
      rw("13R", "13R", 121, 40, 38.90168, 73, 49.002883, 12.5, 4423, 61, 623, {
        freq: "111.50",
        gsDeg: 3.0,
        ident: "JFK",
      }),
      rw("31L", "31L", 301, 40, 37.679665, 73, 46.306845, 12.6, 4423, 61, 995, {
        freq: "111.50",
        gsDeg: 3.0,
        ident: "MOH",
      }),
      rw("04L", "4L", 31, 40, 37.321257, 73, 47.135048, 11.9, 3682, 61, 140, {
        freq: "110.90",
        gsDeg: 3.0,
        ident: "HIQ",
      }),
      rw("22R", "22R", 211, 40, 39.030563, 73, 45.799327, 12.5, 3682, 61, 1044, {
        freq: "110.90",
        gsDeg: 3.0,
        ident: "JOC",
      }),
      rw("13L", "13L", 121, 40, 39.465867, 73, 47.414343, 12.9, 3048, 61, 276, {
        freq: "111.10",
        gsDeg: 3.0,
        ident: "TLK",
      }),
      rw("31R", "31R", 301, 40, 38.623475, 73, 45.556363, 12.6, 3048, 61, 313, {
        freq: "111.10",
        gsDeg: 3.0,
        ident: "RTH",
      }),
      rw("04R", "4R", 31, 40, 37.525697, 73, 46.220735, 11.9, 2560, 61, 0, {
        freq: "109.50",
        gsDeg: 3.0,
        ident: "JFK",
      }),
      rw("22L", "22L", 211, 40, 38.714218, 73, 45.291712, 11.9, 2560, 61, 0, {
        freq: "109.50",
        gsDeg: 3.0,
        ident: "IWY",
      }),
    ],
    terminals: [
      { name: "Terminal 4", lat: 40.6438, lon: -73.7824, heading: 301, gates: 12 },
      { name: "Terminal 5", lat: 40.6466, lon: -73.7765, heading: 211, gates: 10 },
      { name: "Terminal 8", lat: 40.6459, lon: -73.7888, heading: 31, gates: 8 },
    ],
  },
  {
    icao: "KLGA",
    name: "LaGuardia",
    lat: 40.7772422,
    lon: -73.8726056,
    elevM: 6.3,
    magVar: 13,
    frequencies: {
      atis: "125.95",
      clearance: "135.20",
      ground: "121.70",
      tower: "118.70",
      departure: "120.40",
      approach: "120.80",
    },
    runways: [
      rw("04", "4", 32, 40, 46.149755, 73, 53.047142, 20.5, 2134, 46, 0, {
        freq: "110.30",
        gsDeg: 3.14,
        ident: "LGA",
      }),
      rw("22", "22", 212, 40, 47.1262, 73, 52.240402, 11.5, 2134, 46, 0, {
        freq: "110.30",
        gsDeg: 3.0,
        ident: "GBC",
      }),
      rw("13", "13", 122, 40, 46.937752, 73, 52.71115, 11.6, 2134, 46, 0, {
        freq: "108.50",
        gsDeg: 3.1,
        ident: "LGA",
      }),
      rw("31", "31", 302, 40, 46.324287, 73, 51.426695, 6.5, 2134, 46, 0, {
        freq: "111.35",
        gsDeg: 3.0,
        ident: "LGD",
      }),
    ],
    terminals: [{ name: "Terminal B", lat: 40.7746, lon: -73.8718, heading: 302, gates: 10 }],
  },
  {
    icao: "KEWR",
    name: "Newark Liberty International",
    lat: 40.6924806,
    lon: -74.1686878,
    elevM: 5.3,
    magVar: 13,
    frequencies: {
      atis: "134.825",
      clearance: "118.85",
      ground: "121.80",
      tower: "118.30",
      departure: "119.20",
      approach: "127.85",
    },
    runways: [
      rw("04L", "4L", 26, 40, 40.522885, 74, 10.766927, 9.8, 3353, 46, 774, {
        freq: "110.75",
        gsDeg: 3.1,
        ident: "EWR",
      }),
      rw("22R", "22R", 206, 40, 42.153597, 74, 9.730305, 8.5, 3353, 46, 439, {
        freq: "110.75",
        gsDeg: 3.1,
        ident: "JNN",
      }),
      rw("04R", "4R", 26, 40, 40.655045, 74, 10.454708, 11.0, 3048, 46, 363, {
        freq: "108.70",
        gsDeg: 2.95,
        ident: "EZA",
      }),
      rw("22L", "22L", 206, 40, 42.137335, 74, 9.51226, 9.0, 3048, 46, 547, {
        freq: "108.70",
        gsDeg: 3.0,
        ident: "LSQ",
      }),
      rw("11", "11", 95, 40, 42.168262, 74, 10.842445, 17.5, 2050, 46, 68, {
        freq: "109.15",
        gsDeg: 3.0,
        ident: "GPR",
      }),
      rw("29", "29", 275, 40, 42.071965, 74, 9.39261, 9.9, 2050, 46, 0),
    ],
    terminals: [{ name: "Terminal A", lat: 40.6895, lon: -74.1742, heading: 26, gates: 10 }],
  },
];

export function getAirport(icao: string): AirportDef {
  const a = AIRPORTS.find((x) => x.icao === icao);
  if (!a) throw new Error(`Unknown airport ${icao}`);
  return a;
}

export function runwayWorld(rwy: RunwayDef) {
  const p = latLonToWorld(rwy.lat, rwy.lon);
  return { ...p, y: rwy.elevM, heading: rwy.trueHeading };
}

export const SOUTHWEST = {
  canyonBlue: 0x1b3fa0,
  heartRed: 0xe31837,
  sunrise: 0xffbf3f,
  skyBlue: 0x2ea3e6,
  white: 0xf6f7fa,
  silver: 0xb9c0c7,
  greyWing: 0x8e959c,
  window: 0x0b1724,
  heartNavy: 0x142c74,
};

export const WORLD = {
  sizeM: 90000,
  terrainSegs: 128,
  waterY: 0,
};

export const SCENARIOS = [
  {
    id: "jfk-31l",
    title: "KJFK 31L — lined up, ready",
    blurb: "Long runway, city skyline off the nose-right after rotation.",
    icao: "KJFK",
    runway: "31L",
    start: "runway" as const,
  },
  {
    id: "jfk-gate",
    title: "KJFK Terminal 4 — gate",
    blurb: "Cold-and-dark-ish at the gate. Push, taxi, fly.",
    icao: "KJFK",
    runway: "31L",
    start: "gate" as const,
  },
  {
    id: "lga-31",
    title: "KLGA 31 — short-field 737",
    blurb: "LaGuardia's 7,002 ft and the East River.",
    icao: "KLGA",
    runway: "31",
    start: "runway" as const,
  },
  {
    id: "ewr-22r",
    title: "KEWR 22R — Newark",
    blurb: "Manhattan skyline on the right after takeoff.",
    icao: "KEWR",
    runway: "22R",
    start: "runway" as const,
  },
  {
    id: "jfk-ils-04r",
    title: "KJFK ILS 04R — 8 mile final",
    blurb: "Configured, intercept the localizer inbound.",
    icao: "KJFK",
    runway: "04R",
    start: "approach" as const,
  },
  {
    id: "manhattan",
    title: "Hudson corridor VFR",
    blurb: "2,000 ft over the Hudson, Statue to the left.",
    icao: "KJFK",
    runway: "31L",
    start: "vfr" as const,
  },
] as const;
