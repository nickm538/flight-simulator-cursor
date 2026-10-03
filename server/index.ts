import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWeather } from "./weather.js";
import { enhanceAtc } from "./atc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "512kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "skyline-737",
    time: new Date().toISOString(),
    openai: Boolean(process.env.OPENAI_API_KEY),
    openweather: Boolean(process.env.OPENWEATHER_API_KEY),
  });
});

app.get("/api/weather/:icao", async (req, res) => {
  try {
    const wx = await fetchWeather(req.params.icao.toUpperCase());
    res.json(wx);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/atc", enhanceAtc);

app.get("/api/config", (_req, res) => {
  res.json({
    callsign: process.env.DEFAULT_CALLSIGN || "Southwest 1847",
    airports: ["KJFK", "KLGA", "KEWR"],
  });
});

const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) next();
  });
});

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
app.listen(port, host, () => {
  console.log(`SKYLINE 737 listening on http://${host}:${port}`);
});
