# SKYLINE 737 — Cursor Cloud notes

## Run

```bash
npm ci
npm test
npm run dev
```

- UI: Vite on port **5173** (proxies `/api` to 3000)
- API: Express on port **3000**
- Production: `npm run build && PORT=3000 npm start` (serves `dist/public`)

Chrome is enough for a visual pass. Click a scenario on the menu, then use `V` to cycle **ENGINE** and **GEAR** cameras.

## Checks that matter

- `npm test` — geo origin at KJFK, ISA tropopause, parking-brake hold, takeoff acceleration, ATC clearance
- `/api/health` returns `{ ok: true }`
- Canvas paints a 737 on JFK 31L after boot; no WebGL context-lost spam in the console

## Optional secrets (Railway)

`OPENWEATHER_API_KEY`, `OPENAI_API_KEY` — the sim is fully playable with neither.
