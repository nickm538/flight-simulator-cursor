import * as THREE from "three";
import { AIRPORTS, B738, SCENARIOS, getAirport, type AirportDef } from "./aircraft/constants";
import { FlightModel, DEFAULT_WEATHER, type WeatherState } from "./aircraft/flightModel";
import { createBoeing737, updateAircraftVisual, type AircraftRig } from "./aircraft/mesh";
import { createCockpit, type CockpitRig } from "./aircraft/cockpit";
import { GlassCockpit } from "./aircraft/instruments";
import { MAG_VAR_WEST } from "./aircraft/constants";
import { createTerrain, createWater, createSky } from "./world/environment";
import { createAirports } from "./world/airports";
import { createCity } from "./world/city";
import { createTrees, createPeople, createGroundVehicles } from "./world/life";
import { createTraffic, updateTraffic, trafficSnapshot } from "./world/traffic";
import { createClouds, createPrecipitation, updatePrecipitation } from "./world/weatherFx";
import { elevationAt } from "./world/land";
import { AtcEngine } from "./atc/engine";
import { InputController, type Quality } from "./input/controls";
import { SimAudio } from "./audio/engine";
import { Hud, bindMenu } from "./ui/hud";
import { headingVector, latLonToWorld } from "./util/geo";
import { clamp, rad } from "./util/math";
import type { ViewMode } from "./aircraft/flightModel";
import { ftToM } from "./util/math";

const VIEWS: ViewMode[] = ["cockpit", "chase", "wing", "gear", "engine", "tower", "external", "flyby"];

export class Skyline737 {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, 1, 0.15, 80000);
  fm = new FlightModel();
  rig!: AircraftRig;
  cockpit!: CockpitRig;
  glass = new GlassCockpit();
  input = new InputController();
  audio = new SimAudio();
  hud = new Hud();
  atc!: AtcEngine;
  airport: AirportDef = AIRPORTS[0];
  clock = new THREE.Clock();
  view: ViewMode = "cockpit";
  quality: Quality = "auto";
  paused = false;
  atcOpen = false;
  chaseDist = 48;
  water!: THREE.Mesh;
  rain!: THREE.Points;
  traffic: ReturnType<typeof createTraffic> = [];
  running = false;
  sunUniforms: Record<string, { value: unknown }> | null = null;
  private _tmp = new THREE.Vector3();
  private _look = new THREE.Quaternion();
  private _started = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: false,
    });
    this.renderer.setPixelRatio(this.isSoftwareGL() ? 1 : Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !this.isSoftwareGL();
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0x87b7e0);
    this.scene.fog = new THREE.FogExp2(0x9ec7e0, 0.000028);
  }

  async boot() {
    const software = this.isSoftwareGL();
    const q = software ? "low" : this.resolveQuality();
    const sky = createSky(this.renderer, !software);
    this.scene.add(sky.sky, sky.hemi, sky.dir);
    if (sky.env) this.scene.environment = sky.env;
    this.sunUniforms = sky.uniforms as unknown as Record<string, { value: unknown }>;

    this.scene.add(createTerrain());
    this.water = createWater();
    this.scene.add(this.water);
    createAirports(this.scene);
    this.scene.add(createCity(q));
    this.scene.add(createTrees(q));
    this.scene.add(createPeople());
    this.scene.add(createGroundVehicles());

    this.rig = createBoeing737("southwest");
    this.scene.add(this.rig.root);
    this.cockpit = createCockpit(this.glass);
    this.rig.root.add(this.cockpit.group);

    this.traffic = createTraffic(this.scene, software ? 0 : 3);
    this.scene.add(createClouds(software ? { ...DEFAULT_WEATHER, cloudCover: 0.1 } : DEFAULT_WEATHER));
    this.rain = createPrecipitation(DEFAULT_WEATHER);
    this.scene.add(this.rain);

    this.fm.elevationFn = elevationAt;
    this.airport = getAirport("KJFK");
    this.atc = new AtcEngine("Southwest 1847", this.airport);
    this.loadScenario("jfk-31l");

    this.input.attach(this.canvas);
    window.addEventListener("resize", () => this.resize());
    this.resize();

    document.getElementById("atc-choices")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-atc]") as HTMLElement | null;
      if (!btn) return;
      this.audio.blip();
      this.atc.transmit(btn.dataset.atc!, this.fm);
    });
    document.getElementById("btn-atc")?.addEventListener("click", () => (this.atcOpen = !this.atcOpen));
    document.getElementById("btn-view")?.addEventListener("click", () => this.cycleView());
    document.getElementById("btn-gear")?.addEventListener("click", () => (this.fm.controls.gearDown = !this.fm.controls.gearDown));
    document.getElementById("btn-flaps")?.addEventListener("click", () => this.fm.nextFlaps(1));
    document.getElementById("btn-ap")?.addEventListener("click", () => this.toggleAp());
    document.getElementById("btn-brake")?.addEventListener("click", () => {
      this.fm.controls.parkingBrake = !this.fm.controls.parkingBrake;
    });
    document.getElementById("resume")?.addEventListener("click", () => (this.paused = false));
    document.getElementById("enable-audio")?.addEventListener("click", () => this.audio.start());

    bindMenu((id) => {
      this.loadScenario(id);
      this.audio.start();
      this._started = true;
    });

    await this.fetchWeather();
    this.running = true;
    this.loop();
  }

  loadScenario(id: string) {
    const sc = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
    this.airport = getAirport(sc.icao);
    this.atc = new AtcEngine("Southwest 1847", this.airport);
    this.fm.weather = { ...DEFAULT_WEATHER };
    this.fm.controls.parkingBrake = sc.start !== "approach" && sc.start !== "vfr";
    this.fm.controls.gearDown = true;
    this.fm.controls.flapsDetent = sc.start === "approach" ? 15 : 5;
    this.fm.flapsActual = this.fm.controls.flapsDetent;
    this.fm.ap.master = false;
    this.view = "cockpit";

    const rwy = this.airport.runways.find((r) => r.id === sc.runway) ?? this.airport.runways[0];
    const p = latLonToWorld(rwy.lat, rwy.lon);
    const hv = headingVector(rwy.trueHeading);
    const y = elevationAt(p.x, p.z);

    if (sc.start === "runway") {
      const x = p.x + hv.x * 180;
      const z = p.z + hv.z * 180;
      this.fm.placeOnRunway(x, y, z, rwy.trueHeading);
      this.fm.controls.throttle = 0.24;
      this.fm.ap.heading = rwy.trueHeading + MAG_VAR_WEST;
      this.fm.ap.altitudeFt = 5000;
      this.fm.ap.speedKt = 180;
    } else if (sc.start === "gate") {
      const t = this.airport.terminals[0];
      const gp = latLonToWorld(t.lat, t.lon);
      this.fm.placeOnRunway(gp.x + 40, elevationAt(gp.x, gp.z), gp.z + 25, t.heading);
      this.fm.controls.throttle = 0.21;
      this.fm.n1 = [21, 21];
    } else if (sc.start === "approach") {
      const dist = 14000;
      this.fm.placeInAir(p.x - hv.x * dist, y + 720, p.z - hv.z * dist, rwy.trueHeading, 165);
      this.fm.controls.flapsDetent = 15;
      this.fm.controls.gearDown = true;
      this.fm.ap.heading = rwy.trueHeading + MAG_VAR_WEST;
      this.fm.ap.altitudeFt = 2200;
      this.fm.ap.speedKt = 150;
    } else {
      const hv2 = headingVector(20);
      const loc = latLonToWorld(40.705, -74.02);
      this.fm.placeInAir(loc.x, 620, loc.z, 20, 210);
      this.fm.controls.gearDown = false;
      this.fm.controls.flapsDetent = 0;
      this.fm.controls.parkingBrake = false;
      void hv2;
    }
    this.fm.controls.throttleL = this.fm.controls.throttle;
    this.fm.controls.throttleR = this.fm.controls.throttle;
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const inp = this.input.consume();
    if (inp.pause) this.paused = !this.paused;
    if (inp.viewCycle) this.cycleView();
    if (inp.atc) this.atcOpen = !this.atcOpen;
    if (inp.ap) this.toggleAp();
    if (inp.cameraReset) {
      this.input.state.lookX = 0;
      this.input.state.lookY = 0;
    }

    if (!this.paused) {
      if (!this.fm.ap.master) {
        this.fm.controls.elevator = inp.pitch;
        this.fm.controls.aileron = inp.roll;
        this.fm.controls.rudder = inp.yaw;
      }
      this.fm.controls.tiller = inp.tiller || inp.yaw;
      if (!this.fm.ap.at) {
        this.fm.controls.throttle = inp.throttle;
        this.fm.controls.throttleL = inp.throttle;
        this.fm.controls.throttleR = inp.throttle;
      }
      this.fm.controls.brake = inp.brake ? 1 : 0;
      if (inp.flapsUp) this.fm.nextFlaps(-1);
      if (inp.flapsDown) this.fm.nextFlaps(1);
      if (inp.gear) this.fm.controls.gearDown = !this.fm.controls.gearDown;
      if (inp.reverse) this.fm.controls.reverse = !this.fm.controls.reverse;
      this.chaseDist = clamp(this.chaseDist + inp.chaseScroll * 4, 18, 160);

      this.fm.step(dt);
      this.atc.tick(this.fm);
      updateAircraftVisual(this.rig, this.fm, dt, t);
      this.cockpit.yoke.rotation.x = rad(this.fm.controls.elevator * 12);
      this.cockpit.yoke.rotation.z = rad(-this.fm.controls.aileron * 18);
      this.cockpit.throttleL.rotation.x = rad(-this.fm.controls.throttleL * 25);
      this.cockpit.throttleR.rotation.x = rad(-this.fm.controls.throttleR * 25);
      updateTraffic(this.traffic, dt, elevationAt);
      if (this.fm.tireSmoke > 0.4) this.audio.squeal();
      this.audio.update(this.fm);
      const waterMat = this.water.material as THREE.ShaderMaterial;
      if (waterMat.uniforms?.uTime) waterMat.uniforms.uTime.value = t;
      updatePrecipitation(this.rain, dt, this.fm.position, this.fm.weather);
    }

    const ils = this.ils();
    this.glass.update(this.fm, AIRPORTS, trafficSnapshot(this.traffic), ils.loc, ils.gs);
    this.updateCamera(dt, t);
    this.cockpit.group.visible = this.view === "cockpit";
    this.renderer.render(this.scene, this.camera);
    this.hud.render(this.fm, this.atc.log, this.atc.choices(this.fm), this.view, this.paused, this.atcOpen);
  };

  private updateCamera(dt: number, t: number) {
    const shake = this.fm.stickShaker ? Math.sin(t * 62) * 0.03 : this.fm.engVibration;
    const eye = this._tmp;
    this.camera.fov = this.view === "cockpit" ? 68 : 60;
    this.camera.updateProjectionMatrix();

    if (this.view === "cockpit") {
      this.cockpit.cameraAnchor.getWorldPosition(eye);
      this.camera.position.copy(eye);
      const q = this.rig.root.quaternion;
      const look = this._look.setFromEuler(
        new THREE.Euler(this.input.state.lookY + shake + 0.12, this.input.state.lookX + Math.PI, 0, "YXZ"),
      );
      this.camera.quaternion.copy(q).multiply(look);
      return;
    }

    this.fm.forward(this._tmp);
    const fwd = this._tmp.clone();
    const up = this.fm.up(new THREE.Vector3());
    const right = this.fm.right(new THREE.Vector3());
    const pos = this.fm.position;

    if (this.view === "chase") {
      this.camera.position.copy(pos).addScaledVector(fwd, -this.chaseDist).addScaledVector(up, 9);
      this.camera.lookAt(pos.x + fwd.x * 18, pos.y + 2, pos.z + fwd.z * 18);
    } else if (this.view === "wing") {
      this.camera.position.copy(pos).addScaledVector(right, -18).addScaledVector(up, 2).addScaledVector(fwd, -2);
      this.camera.lookAt(pos.x + right.x * -8, pos.y - 1, pos.z + right.z * -8);
    } else if (this.view === "gear") {
      this.camera.position.copy(pos).addScaledVector(right, 5.6).addScaledVector(up, -2.0).addScaledVector(fwd, 1.4);
      this.camera.lookAt(pos.clone().addScaledVector(right, 2.7).addScaledVector(up, -2.55).addScaledVector(fwd, -1.55));
    } else if (this.view === "engine") {
      this.camera.position.copy(pos).addScaledVector(right, -5.85).addScaledVector(up, -2.05).addScaledVector(fwd, 8.6);
      this.camera.lookAt(pos.clone().addScaledVector(right, -5.85).addScaledVector(up, -2.15).addScaledVector(fwd, 3.8));
    } else if (this.view === "tower") {
      const tw = latLonToWorld(this.airport.lat, this.airport.lon);
      this.camera.position.set(tw.x + 220, 52, tw.z + 180);
      this.camera.lookAt(pos);
    } else if (this.view === "flyby") {
      this.camera.position.copy(pos).addScaledVector(right, 55).addScaledVector(up, 8).addScaledVector(fwd, -10);
      this.camera.lookAt(pos);
    } else {
      const a = t * 0.15;
      this.camera.position.set(pos.x + Math.cos(a) * 70, pos.y + 18, pos.z + Math.sin(a) * 70);
      this.camera.lookAt(pos);
    }
    void dt;
  }

  private ils() {
    const rwy = this.airport.runways.find((r) => r.id === this.atc.runway) ?? this.airport.runways[0];
    const p = latLonToWorld(rwy.lat, rwy.lon);
    const h = rad(rwy.trueHeading);
    const hv = headingVector(rwy.trueHeading);
    const dx = this.fm.position.x - p.x;
    const dz = this.fm.position.z - p.z;
    const along = dx * hv.x + dz * hv.z;
    const rx = Math.cos(h);
    const rz = Math.sin(h);
    const cross = dx * rx + dz * rz;
    const loc = clamp((Math.atan2(cross, Math.max(30, along)) * 180) / Math.PI / 2.5, -2.5, 2.5);
    const gsIdeal = Math.max(0, along) * Math.tan(rad(rwy.ils?.gsDeg ?? 3));
    const gs = clamp((this.fm.position.y - (rwy.elevM + gsIdeal)) / 40, -2.5, 2.5);
    return { loc, gs, along };
  }

  private cycleView() {
    const i = VIEWS.indexOf(this.view);
    this.view = VIEWS[(i + 1) % VIEWS.length];
  }

  private toggleAp() {
    this.fm.ap.master = !this.fm.ap.master;
    this.fm.ap.at = this.fm.ap.master;
    this.fm.ap.hdgSel = this.fm.ap.master;
    this.fm.ap.altHld = this.fm.ap.master;
  }

  private resolveQuality(): "high" | "medium" | "low" {
    if (this.isSoftwareGL()) return "low";
    if (this.input.isTouch) return "low";
    if (innerWidth < 1100) return "medium";
    return "high";
  }

  private isSoftwareGL(): boolean {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "")
      : String(gl.getParameter(gl.RENDERER) || "");
    return /swiftshader|llvmpipe|softpipe|software|webkit webgl/i.test(gpu);
  }

  private resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  private async fetchWeather() {
    try {
      const r = await fetch(`/api/weather/${this.airport.icao}`);
      if (!r.ok) return;
      const w = (await r.json()) as Partial<WeatherState> & { raw?: string };
      this.fm.weather = { ...DEFAULT_WEATHER, ...w };
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.00002 + (1 - clamp((w.visibilityM ?? 16000) / 16000, 0.2, 1)) * 0.0002;
      }
    } catch {
      /* offline weather is fine */
    }
  }
}

void B738;
void ftToM;
