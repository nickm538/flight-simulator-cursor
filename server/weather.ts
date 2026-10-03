export interface Wx {
  windDirTrue: number;
  windKt: number;
  gustKt: number;
  visibilityM: number;
  cloudBaseM: number;
  cloudCover: number;
  qnhPa: number;
  dIsa: number;
  precip: number;
  temperatureC: number;
  raw: string;
  source: string;
}

const FALLBACK: Wx = {
  windDirTrue: 130,
  windKt: 10,
  gustKt: 14,
  visibilityM: 16000,
  cloudBaseM: 1100,
  cloudCover: 0.25,
  qnhPa: 102460,
  dIsa: 4,
  precip: 0,
  temperatureC: 21,
  raw: "KJFK 032051Z 13010KT 10SM FEW035 21/12 A3025",
  source: "simulated",
};

interface MetarJson {
  icaoId?: string;
  wdir?: number | string;
  wspd?: number;
  wgst?: number;
  visib?: string | number;
  cover?: string;
  ceil?: number;
  altim?: number;
  temp?: number;
  rawOb?: string;
  clouds?: { cover: string; base: number }[];
}

export async function fetchWeather(icao: string): Promise<Wx> {
  const key = process.env.OPENWEATHER_API_KEY;
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) {
      const data = (await res.json()) as MetarJson[];
      const m = Array.isArray(data) ? data[0] : undefined;
      if (m) return fromMetar(m);
    }
  } catch {
    /* fall through */
  }

  if (key) {
    try {
      const ow = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=New%20York,US&appid=${key}&units=metric`,
      );
      if (ow.ok) {
        const j = (await ow.json()) as {
          wind?: { speed: number; deg: number; gust?: number };
          visibility?: number;
          clouds?: { all: number };
          main?: { temp: number; pressure: number };
          weather?: { main: string }[];
        };
        return {
          ...FALLBACK,
          windDirTrue: j.wind?.deg ?? 130,
          windKt: (j.wind?.speed ?? 5) * 1.94384,
          gustKt: (j.wind?.gust ?? j.wind?.speed ?? 7) * 1.94384,
          visibilityM: j.visibility ?? 16000,
          cloudCover: (j.clouds?.all ?? 20) / 100,
          qnhPa: (j.main?.pressure ?? 1013) * 100,
          temperatureC: j.main?.temp ?? 21,
          precip: j.weather?.[0]?.main === "Rain" ? 0.4 : 0,
          raw: JSON.stringify(j.weather ?? []),
          source: "openweather",
        };
      }
    } catch {
      /* ignore */
    }
  }

  return { ...FALLBACK, raw: `${icao} simulated METAR` };
}

function fromMetar(m: MetarJson): Wx {
  const vis =
    typeof m.visib === "number"
      ? m.visib * 1609.34
      : String(m.visib ?? "10").includes("10")
        ? 16000
        : parseFloat(String(m.visib ?? "10")) * 1609.34;
  const coverMap: Record<string, number> = { CLR: 0, SKC: 0, FEW: 0.2, SCT: 0.4, BKN: 0.7, OVC: 1 };
  const cover = m.clouds?.[0]?.cover ?? m.cover ?? "FEW";
  const baseFt = m.clouds?.[0]?.base ?? m.ceil ?? 3500;
  const altim = m.altim ?? 30.25;
  return {
    windDirTrue: typeof m.wdir === "number" ? m.wdir : 130,
    windKt: m.wspd ?? 10,
    gustKt: m.wgst ?? (m.wspd ?? 10) + 4,
    visibilityM: vis || 16000,
    cloudBaseM: baseFt * 0.3048,
    cloudCover: coverMap[cover] ?? 0.25,
    qnhPa: altim > 100 ? altim * 100 : altim * 3386.39,
    dIsa: (m.temp ?? 21) - 15,
    precip: cover === "OVC" ? 0.15 : 0,
    temperatureC: m.temp ?? 21,
    raw: m.rawOb ?? "",
    source: "aviationweather",
  };
}
