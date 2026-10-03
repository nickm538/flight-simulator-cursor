import * as THREE from "three";
import type { AirportDef, RunwayDef } from "../aircraft/constants";
import { AIRPORTS } from "../aircraft/constants";
import { headingVector, latLonToWorld } from "../util/geo";
import { asphaltTexture, concreteTexture, runwayTexture } from "../render/textures";
import { emissive, metal, paint, std } from "../render/materials";
import { elevationAt } from "./land";
import { rad } from "../util/math";

export function createAirports(parent: THREE.Object3D) {
  for (const ap of AIRPORTS) parent.add(buildAirport(ap));
}

function buildAirport(ap: AirportDef): THREE.Group {
  const g = new THREE.Group();
  g.name = ap.icao;
  const origin = latLonToWorld(ap.lat, ap.lon);
  const y = elevationAt(origin.x, origin.z);

  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(ap.icao === "KJFK" ? 3800 : 2400, 48),
    std({ color: 0x5a7a4a, roughness: 0.95 }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(origin.x, y + 0.15, origin.z);
  plate.receiveShadow = true;
  g.add(plate);

  for (const rw of ap.runways) g.add(buildRunway(rw, y));
  addTaxiways(g, ap, y);
  addTerminals(g, ap, y);
  addLights(g, ap, y);
  return g;
}

function buildRunway(rw: RunwayDef, fieldY: number): THREE.Group {
  const g = new THREE.Group();
  const p = latLonToWorld(rw.lat, rw.lon);
  const hv = headingVector(rw.trueHeading);
  const y = fieldY + 0.35;
  const geo = new THREE.PlaneGeometry(rw.widthM, rw.lengthM, 1, 8);
  const mat = std({
    map: runwayTexture(),
    color: 0x9aa0a6,
    roughness: 0.88,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rad(-rw.trueHeading);
  const cx = p.x + hv.x * (rw.lengthM / 2);
  const cz = p.z + hv.z * (rw.lengthM / 2);
  mesh.position.set(cx, y, cz);
  mesh.receiveShadow = true;
  g.add(mesh);

  const marks = makeRunwayMarkings(rw);
  marks.rotation.x = -Math.PI / 2;
  marks.rotation.z = rad(-rw.trueHeading);
  marks.position.set(cx, y + 0.04, cz);
  g.add(marks);

  addThresholdLights(g, p.x, y, p.z, hv, rw);
  return g;
}

function makeRunwayMarkings(rw: RunwayDef): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 2048;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 2048);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, 256, 2048);
  ctx.fillStyle = "#f4f6f8";
  for (let i = 0; i < 16; i++) ctx.fillRect(18 + i * 14, 40, 8, 90);
  ctx.font = "bold 90px Arial";
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(128, 220);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(rw.mag, 0, 0);
  ctx.restore();
  ctx.fillRect(124, 0, 8, 2048);
  for (let y = 400; y < 1700; y += 220) {
    ctx.fillRect(70, y, 28, 90);
    ctx.fillRect(158, y, 28, 90);
  }
  for (let i = 0; i < 16; i++) ctx.fillRect(18 + i * 14, 1900, 8, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(rw.widthM * 0.92, rw.lengthM * 0.98), mat);
}

function addThresholdLights(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  hv: { x: number; z: number },
  rw: RunwayDef,
) {
  const right = { x: Math.cos((rw.trueHeading * Math.PI) / 180), z: Math.sin((rw.trueHeading * Math.PI) / 180) };
  const bulbs: THREE.Mesh[] = [];
  for (let i = 1; i <= 8; i++) {
    const d = -i * 110;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), emissive(0xff7a30, 2.4));
    bulb.position.set(x + hv.x * d, y + 0.4, z + hv.z * d);
    bulbs.push(bulb);
  }
  const edgeCount = Math.min(16, Math.floor(rw.lengthM / 180));
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < edgeCount; i++) {
      const d = i * 80;
      const edge = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), emissive(0xfff2c8, 1.4));
      edge.position.set(x + hv.x * d + right.x * (rw.widthM * 0.52) * s, y + 0.25, z + hv.z * d + right.z * (rw.widthM * 0.52) * s);
      bulbs.push(edge);
    }
  }
  g.add(...bulbs);
}

function addTaxiways(g: THREE.Group, ap: AirportDef, y: number) {
  const origin = latLonToWorld(ap.lat, ap.lon);
  const asphalt = std({ map: asphaltTexture(), color: 0x4a4e54, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(42, ap.icao === "KJFK" ? 2200 : 1400), asphalt);
    tw.rotation.x = -Math.PI / 2;
    tw.position.set(origin.x + (i - 2.5) * 90, y + 0.28, origin.z);
    tw.receiveShadow = true;
    g.add(tw);
  }
  const yellow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 2000),
    new THREE.MeshBasicMaterial({ color: 0xffd24a }),
  );
  yellow.rotation.x = -Math.PI / 2;
  yellow.position.set(origin.x, y + 0.32, origin.z);
  g.add(yellow);
}

function addTerminals(g: THREE.Group, ap: AirportDef, y: number) {
  for (const t of ap.terminals) {
    const p = latLonToWorld(t.lat, t.lon);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(180, 22, 48), paint(0xc9d2dc, 0.45, 0.15));
    hall.position.set(p.x, y + 11, p.z);
    hall.rotation.y = rad(-t.heading);
    hall.castShadow = true;
    hall.receiveShadow = true;
    g.add(hall);
    const glassWall = new THREE.Mesh(
      new THREE.BoxGeometry(176, 14, 2),
      new THREE.MeshPhysicalMaterial({ color: 0x9ec9e8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.55 }),
    );
    glassWall.position.set(p.x, y + 12, p.z + 24);
    glassWall.rotation.y = rad(-t.heading);
    g.add(glassWall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(190, 2.2, 56), metal(0x8b9510, 0.4, 0.35));
    roof.position.set(p.x, y + 23, p.z);
    roof.rotation.y = rad(-t.heading);
    g.add(roof);
    for (let i = 0; i < t.gates; i++) {
      const jetway = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 28), paint(0xd8dee4, 0.5, 0.1));
      const side = i % 2 === 0 ? 1 : -1;
      jetway.position.set(p.x + (i - t.gates / 2) * 14, y + 7, p.z + side * 38);
      jetway.rotation.y = rad(-t.heading);
      g.add(jetway);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 42, 10), paint(0xe8ecef, 0.4, 0.12));
    tower.position.set(p.x + 90, y + 21, p.z + 70);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 6, 10), paint(0x1b3fa0, 0.35, 0.1));
    cab.position.set(p.x + 90, y + 44, p.z + 70);
    g.add(tower, cab);
  }
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(80, 14, 40), paint(0xb7bec4, 0.55, 0.08));
  const o = latLonToWorld(ap.lat, ap.lon);
  cargo.position.set(o.x + 420, y + 7, o.z - 380);
  g.add(cargo);
  void concreteTexture;
}

function addLights(g: THREE.Group, ap: AirportDef, y: number) {
  const o = latLonToWorld(ap.lat, ap.lon);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), emissive(0x66ff99, 3));
  beacon.position.set(o.x, y + 48, o.z);
  g.add(beacon);
}
