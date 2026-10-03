import * as THREE from "three";
import { latLonToWorld } from "../util/geo";
import { facadeTexture } from "../render/textures";
import { metal, paint, std } from "../render/materials";
import { elevationAt, isManhattan } from "./land";
import { hash2, mulberry32 } from "../util/math";

export function createCity(quality: "high" | "medium" | "low"): THREE.Group {
  const g = new THREE.Group();
  g.name = "nyc";
  g.add(createManhattanBlocks(quality));
  g.add(createLandmarks());
  g.add(createBrooklyn());
  g.add(createJerseyCity());
  return g;
}

function createManhattanBlocks(quality: "high" | "medium" | "low"): THREE.Group {
  const g = new THREE.Group();
  const count = quality === "high" ? 1400 : quality === "medium" ? 800 : 280;
  const geos = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.BoxGeometry(1, 1, 1),
  ];
  const mats = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    std({ map: facadeTexture(i), roughness: 0.55, metalness: 0.12, color: 0xffffff }),
  );
  const meshes = mats.map((m, i) => {
    const mesh = new THREE.InstancedMesh(geos[i % 2], m, Math.ceil(count / mats.length));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.count = 0;
    g.add(mesh);
    return mesh;
  });

  const dummy = new THREE.Object3D();
  const south = latLonToWorld(40.702, -74.015);
  const aveW = 85;
  const stD = 62;
  let n = 0;
  for (let row = 0; row < 90 && n < count; row++) {
    for (let col = 0; col < 18 && n < count; col++) {
      const x = south.x + col * aveW + 20;
      const z = south.z - row * stD;
      if (!isManhattan(x, z)) continue;
      if (row > 48 && row < 60 && col > 4 && col < 12) continue;
      const hSeed = hash2(row, col);
      let h = 18 + hSeed * 40;
      if (row > 18 && row < 36 && col > 5 && col < 14) h = 80 + hSeed * 220;
      if (row < 12 && col > 4 && col < 12) h = 70 + hSeed * 180;
      if (row > 70) h = 16 + hSeed * 28;
      const w = 22 + (hSeed * 18);
      const d = 16 + ((hSeed * 13) % 12);
      dummy.position.set(x, elevationAt(x, z) + h / 2, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = ((row + col) % 5) * 0.02;
      dummy.updateMatrix();
      const mesh = meshes[n % meshes.length];
      mesh.setMatrixAt(mesh.count, dummy.matrix);
      mesh.count++;
      n++;
    }
  }
  for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  return g;
}

function createBrooklyn(): THREE.Group {
  const g = new THREE.Group();
  const mat = std({ map: facadeTexture(3), roughness: 0.6, metalness: 0.08 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 500);
  mesh.castShadow = true;
  const dummy = new THREE.Object3D();
  const rng = mulberry32(42);
  const origin = latLonToWorld(40.68, -73.98);
  let c = 0;
  for (let i = 0; i < 500; i++) {
    const x = origin.x + (rng() - 0.5) * 7000;
    const z = origin.z + (rng() - 0.5) * 6000;
    const h = 10 + rng() * 28;
    dummy.position.set(x, elevationAt(x, z) + h / 2, z);
    dummy.scale.set(16 + rng() * 10, h, 14 + rng() * 10);
    dummy.updateMatrix();
    mesh.setMatrixAt(c++, dummy.matrix);
  }
  mesh.count = c;
  g.add(mesh);
  return g;
}

function createJerseyCity(): THREE.Group {
  const g = new THREE.Group();
  const mat = std({ map: facadeTexture(4), roughness: 0.5, metalness: 0.18 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 180);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(99);
  const origin = latLonToWorld(40.72, -74.04);
  for (let i = 0; i < 180; i++) {
    const x = origin.x + (rng() - 0.5) * 2800;
    const z = origin.z + (rng() - 0.5) * 3200;
    const h = 24 + rng() * 90;
    dummy.position.set(x, elevationAt(x, z) + h / 2, z);
    dummy.scale.set(18, h, 18);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.castShadow = true;
  g.add(mesh);
  return g;
}

function createLandmarks(): THREE.Group {
  const g = new THREE.Group();
  g.add(oneWtc());
  g.add(empire());
  g.add(chrysler());
  g.add(statue());
  g.add(brooklynBridge());
  g.add(centralPark());
  g.add(timesSquareGlow());
  return g;
}

function placedBox(lat: number, lon: number, sx: number, sy: number, sz: number, color: number, yOff = 0) {
  const p = latLonToWorld(lat, lon);
  const y = elevationAt(p.x, p.z);
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), paint(color, 0.35, 0.2));
  m.position.set(p.x, y + sy / 2 + yOff, p.z);
  m.castShadow = true;
  return m;
}

function oneWtc() {
  const g = new THREE.Group();
  const p = latLonToWorld(40.7127, -74.0134);
  const y = elevationAt(p.x, p.z);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(58, 417, 58), paint(0xc5d0da, 0.22, 0.35));
  tower.position.set(p.x, y + 208, p.z);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3, 124, 8), metal(0xdde3ea, 0.25, 0.7));
  spire.position.set(p.x, y + 478, p.z);
  tower.castShadow = true;
  g.add(tower, spire);
  return g;
}

function empire() {
  const g = new THREE.Group();
  const p = latLonToWorld(40.7484, -73.9857);
  const y = elevationAt(p.x, p.z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(58, 80, 50), paint(0xb9a07a, 0.45, 0.08));
  base.position.set(p.x, y + 40, p.z);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(42, 200, 36), paint(0xc4b08c, 0.4, 0.1));
  mid.position.set(p.x, y + 180, p.z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(22, 90, 20), paint(0xaea07f, 0.38, 0.12));
  top.position.set(p.x, y + 325, p.z);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.2, 50, 8), metal(0xcccccc, 0.3, 0.7));
  mast.position.set(p.x, y + 395, p.z);
  g.add(base, mid, top, mast);
  return g;
}

function chrysler() {
  const p = latLonToWorld(40.7516, -73.9755);
  const y = elevationAt(p.x, p.z);
  const m = new THREE.Mesh(new THREE.BoxGeometry(32, 250, 32), paint(0xc9c2b0, 0.32, 0.25));
  m.position.set(p.x, y + 125, p.z);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(16, 38, 8), metal(0xd7c37a, 0.28, 0.65));
  cap.position.set(p.x, y + 268, p.z);
  const g = new THREE.Group();
  g.add(m, cap);
  return g;
}

function statue() {
  const g = new THREE.Group();
  const p = latLonToWorld(40.6892, -74.0445);
  const y = 3;
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(18, 28, 18), paint(0xcfc6b4, 0.55, 0.05));
  pedestal.position.set(p.x, y + 14, p.z);
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 5.2, 22, 10), paint(0x3c8f73, 0.55, 0.08));
  robe.position.set(p.x, y + 39, p.z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), paint(0x3c8f73, 0.5, 0.08));
  head.position.set(p.x, y + 52, p.z);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 12, 8), paint(0x3c8f73));
  arm.position.set(p.x + 4.2, y + 54, p.z);
  arm.rotation.z = -0.9;
  const torch = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), std({ color: 0xffd24a, emissive: 0xffaa33, emissiveIntensity: 2 }));
  torch.position.set(p.x + 8.2, y + 60, p.z);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.2, 7), paint(0x3c8f73));
  crown.position.set(p.x, y + 55.2, p.z);
  g.add(pedestal, robe, head, arm, torch, crown);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 48, 4, 16), paint(0x4d7a3e, 0.9, 0));
  island.position.set(p.x, 2, p.z);
  g.add(island);
  return g;
}

function brooklynBridge() {
  const g = new THREE.Group();
  const a = latLonToWorld(40.706, -73.997);
  const b = latLonToWorld(40.702, -73.993);
  const y = 18;
  const towerMat = paint(0xc9c2b4, 0.5, 0.05);
  for (const p of [a, b]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(12, 85, 8), towerMat);
    t.position.set(p.x, y + 20, p.z);
    g.add(t);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 6), towerMat);
    arch.position.set(p.x, y + 55, p.z);
    g.add(arch);
  }
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) * 1.8;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, len), paint(0x6a6e72, 0.6, 0.1));
  deck.position.set((a.x + b.x) / 2, y + 24, (a.z + b.z) / 2);
  deck.lookAt(b.x, y + 24, b.z);
  g.add(deck);
  return g;
}

function centralPark() {
  const p = latLonToWorld(40.7829, -73.9654);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(800, 4000), std({ color: 0x3d7a3c, roughness: 0.95 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(p.x, elevationAt(p.x, p.z) + 0.6, p.z);
  lawn.receiveShadow = true;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(90, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x1a5878, roughness: 0.15, metalness: 0.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(p.x + 40, lawn.position.y + 0.2, p.z + 200);
  const g = new THREE.Group();
  g.add(lawn, water);
  return g;
}

function timesSquareGlow() {
  const p = latLonToWorld(40.758, -73.9855);
  const light = new THREE.PointLight(0xff5588, 4, 260);
  light.position.set(p.x, 40, p.z);
  const g = new THREE.Group();
  g.add(light);
  g.add(placedBox(40.758, -73.9855, 28, 90, 22, 0x222831));
  return g;
}
