import * as THREE from "three";
import { createBoeing737, updateAircraftVisual, type AircraftRig } from "../aircraft/mesh";
import { FlightModel } from "../aircraft/flightModel";
import { AIRPORTS } from "../aircraft/constants";
import { headingVector, latLonToWorld } from "../util/geo";
import { paint } from "../render/materials";
import { ktToMs, rad } from "../util/math";

export interface TrafficAc {
  rig: AircraftRig;
  fm: FlightModel;
  phase: "approach" | "depart" | "taxi";
  rwyIndex: number;
  t: number;
}

export function createTraffic(scene: THREE.Scene, count = 3): TrafficAc[] {
  const list: TrafficAc[] = [];
  const jfk = AIRPORTS[0];
  const colors = [0x1b3fa0, 0xe31837, 0x0033a0, 0xff5a00, 0xffffff];
  for (let i = 0; i < count; i++) {
    const rig = createBoeing737("generic");
    rig.root.scale.setScalar(1);
    rig.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshStandardMaterial).color && i > 0) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        if (mat.color.getHex() === 0xf6f7fa || mat.color.getHex() === 0xf4f6f8) {
          mat.color.setHex(colors[i % colors.length]);
          m.material = mat;
        }
      }
    });
    const fm = new FlightModel();
    const rw = jfk.runways[i % 4];
    const p = latLonToWorld(rw.lat, rw.lon);
    const hv = headingVector(rw.trueHeading);
    const dist = 6000 + i * 2200;
    fm.placeInAir(p.x - hv.x * dist, 420 + i * 80, p.z - hv.z * dist, rw.trueHeading, 160);
    fm.controls.gearDown = dist < 5000;
    scene.add(rig.root);
    list.push({ rig, fm, phase: "approach", rwyIndex: i % 4, t: i * 12 });
  }
  void paint;
  void ktToMs;
  void rad;
  return list;
}

export function updateTraffic(list: TrafficAc[], dt: number, elev: (x: number, z: number) => number) {
  for (const ac of list) {
    ac.fm.elevationFn = elev;
    ac.t += dt;
    if (ac.phase === "approach") {
      ac.fm.controls.throttle = 0.42;
      ac.fm.controls.throttleL = 0.42;
      ac.fm.controls.throttleR = 0.42;
      ac.fm.ap.master = true;
      ac.fm.ap.at = true;
      ac.fm.ap.app = true;
      ac.fm.ap.altHld = true;
      ac.fm.ap.hdgSel = true;
      const rw = AIRPORTS[0].runways[ac.rwyIndex];
      ac.fm.ap.heading = rw.trueHeading + 13;
      ac.fm.ap.speedKt = 150;
      ac.fm.ap.altitudeFt = Math.max(50, ac.fm.altitudeFt - dt * 8);
      if (ac.fm.radioAlt < 4 && ac.fm.onGround) {
        ac.fm.controls.brake = 0.6;
        ac.fm.controls.throttle = 0.05;
      }
    }
    ac.fm.step(dt);
    updateAircraftVisual(ac.rig, ac.fm, dt, ac.t);
  }
}

export function trafficSnapshot(list: TrafficAc[]) {
  return list.map((a) => ({
    x: a.fm.position.x,
    z: a.fm.position.z,
    hdg: a.fm.headingTrue,
    alt: a.fm.altitudeFt,
  }));
}
