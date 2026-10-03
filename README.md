# SKYLINE 737

Cockpit-accurate **Boeing 737-800** flight simulator of the New York metro area, playable in a desktop or mobile browser and hosted as a single Railway service.

You sit in the captain’s seat of a Southwest 737-800 (heart livery, CFM56 fans, rolling gear, Boeing-style PFD / ND / EICAS). The sandbox is KJFK, KLGA, KEWR, Manhattan, the Hudson, and Jamaica Bay — sized like an FSX regional world, not a planet-scale photogrammetry sim.

## Why this stack (and not Unreal / Unity / native C++)

Railway needs a hosted **web UI** that also runs on phones. Unreal, Unity, MSFS, or a native C++/C# client cannot be the primary runtime here without a GPU streaming farm. The live game is therefore:

| Layer | Choice | Role |
| --- | --- | --- |
| Runtime | WebGL2 + Three.js r170 | PBR airframe, city, water, sky |
| Language | TypeScript | Client and server |
| Flight model | Custom 6-DOF | ISA atmosphere, lift/drag/side, ground handling, CFM56 spool |
| Instruments | Canvas → PBR screens | Captain PFD, ND, EICAS |
| ATC | Client state machine + optional OpenAI | Full FAA-style tree offline |
| Weather | aviationweather.gov METAR | Optional OpenWeather key |
| Host | Node/Express + Vite static | One Docker image on Railway |

Blender / Unreal remain the right **offline DCC** tools if you later swap the procedural 737 for a sculpted glTF. The runtime does not depend on them.

This is a fan-made training recreation. Boeing, Southwest, and airport names are used descriptively.

## Run locally

```bash
npm ci
npm test
npm run dev
```

- Client: http://127.0.0.1:5173
- API: http://127.0.0.1:3000/api/health

Production-style:

```bash
npm run build
PORT=3000 npm start
```

Then open http://127.0.0.1:3000

## Fly

1. Pick a scenario (JFK 31L is the default “ready for takeoff” shot).
2. Click **AUDIO**, click the scene to look around.
3. `Shift` for takeoff thrust, hold `S` to rotate around 145 KIAS, `G` gear up, `[` / `]` flaps.
4. `V` cycles cameras — **ENGINE** shows fan blades, **GEAR** shows wheel spokes.
5. `Enter` opens ATC. Request clearance → push → taxi → takeoff → vectors → land.

| Input | Action |
| --- | --- |
| W/S or ↑/↓ | Pitch |
| A/D or ←/→ | Roll |
| Q / E | Rudder / nosewheel |
| Shift / Ctrl, Z / X, 1–4 | Throttle |
| G | Gear |
| [ ] or F | Flaps |
| B | Brakes |
| V | View |
| Alt+P | Autopilot |
| Enter | ATC |
| Esc | Pause |

Touch: left stick for yoke, right slider for throttle, bottom MCP buttons.

## Railway

1. New project → deploy this repo.
2. Railway detects `Dockerfile` / `railway.toml`.
3. Set `PORT` is automatic. Optional secrets:

```
OPENWEATHER_API_KEY=        # richer city weather overlay
OPENAI_API_KEY=             # extra ATC phrasing (full tree works without it)
OPENAI_MODEL=gpt-4o-mini
DEFAULT_CALLSIGN=Southwest 1847
```

Health check: `/api/health`

The container builds the Vite client into `dist/public` and serves it from Express with the JSON APIs.

## What’s modeled

- 737-800 dimensions, CFM56-7B26 thrust, flap detents 0–40, gear transit, reversers, yaw-damper-ish damping
- ISA atmosphere, indicated vs true, Mach, ground effect, stall buffet
- Heart livery, 24 fan blades, 5-spoke wheels, flaps/slats/spoilers/ailerons/rudder/elevators
- JFK / LGA / EWR runways from AirNav true headings and threshold coordinates
- Manhattan blocks, One WTC, Empire State, Chrysler, Statue of Liberty, Brooklyn Bridge, Central Park
- AI traffic on JFK finals, ground crew / vehicles, trees
- ATIS, clearance, ground, tower, departure, approach, PAN / MAYDAY

## Repo map

```
client/src/aircraft   737 mesh, 6-DOF, glass cockpit
client/src/world      terrain, airports, city, traffic, weather
client/src/atc        phraseology engine
server/               Express + METAR + optional OpenAI
tests/                geo, ISA, takeoff roll, ATC
```
