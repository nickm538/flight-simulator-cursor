import * as THREE from "three";
import { barkTexture, leafTexture } from "../render/textures";
import { paint, std } from "../render/materials";
import { elevationAt, isLand, isManhattan } from "./land";
import { mulberry32 } from "../util/math";
import { latLonToWorld } from "../util/geo";

export function createTrees(quality: "high" | "medium" | "low"): THREE.Group {
  const g = new THREE.Group();
  const n = quality === "high" ? 900 : quality === "medium" ? 500 : 180;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 4.2, 6);
  const canopyGeo = new THREE.SphereGeometry(1, 8, 6);
  const trunkMat = std({ map: barkTexture(), roughness: 0.95, color: 0x8a5a3a });
  const leafMat = std({ map: leafTexture(), color: 0x2f7a38, roughness: 0.82 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, n);
  trunks.castShadow = true;
  canopies.castShadow = true;
  const dummy = new THREE.Object3D();
  const rng = mulberry32(7);
  const park = latLonToWorld(40.7829, -73.9654);
  let placed = 0;
  for (let i = 0; i < n * 4 && placed < n; i++) {
    let x: number;
    let z: number;
    if (rng() < 0.22) {
      x = park.x + (rng() - 0.5) * 700;
      z = park.z + (rng() - 0.5) * 3600;
    } else {
      x = (rng() - 0.42) * 50000;
      z = (rng() - 0.5) * 50000;
    }
    if (!isLand(x, z)) continue;
    if (isManhattan(x, z) && rng() > 0.08 && Math.hypot(x - park.x, z - park.z) > 900) continue;
    const y = elevationAt(x, z);
    const s = 0.8 + rng() * 1.4;
    dummy.position.set(x, y + 2.1 * s, z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = y + 4.4 * s;
    dummy.scale.set(2.4 * s, 2.1 * s, 2.4 * s);
    dummy.updateMatrix();
    canopies.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  trunks.count = placed;
  canopies.count = placed;
  g.add(trunks, canopies);
  return g;
}

export function createPeople(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 4, 8), paint(0xe31837, 0.7, 0.05));
  torso.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), paint(0xe0b394, 0.65, 0.05));
  head.position.y = 1.38;
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 3, 6), paint(0x1b2a44, 0.7, 0.05));
  legL.position.set(-0.08, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.08;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.38, 3, 6), paint(0xe31837, 0.7, 0.05));
  armL.position.set(-0.26, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.26;
  body.add(torso, head, legL, legR, armL, armR);
  body.updateMatrixWorld(true);

  const geo = new THREE.BoxGeometry(0.4, 1.7, 0.28);
  const colors = [0xe31837, 0x1b3fa0, 0xffbf3f, 0x2ea3e6, 0xf4f6f8, 0x333333];
  const mesh = new THREE.InstancedMesh(geo, std({ roughness: 0.7 }), 120);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const spots = [
    latLonToWorld(40.6438, -73.7824),
    latLonToWorld(40.6466, -73.7765),
    latLonToWorld(40.7746, -73.8718),
    latLonToWorld(40.6895, -74.1742),
  ];
  let i = 0;
  for (const s of spots) {
    for (let k = 0; k < 30; k++) {
      dummy.position.set(s.x + (k % 10) * 1.6 - 8, elevationAt(s.x, s.z) + 0.85, s.z + Math.floor(k / 10) * 1.8);
      dummy.rotation.y = k * 0.4;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(colors[k % colors.length]);
      mesh.setColorAt(i, color);
      i++;
    }
  }
  mesh.count = i;
  mesh.castShadow = true;
  mesh.instanceColor = mesh.instanceColor ?? new THREE.InstancedBufferAttribute(new Float32Array(i * 3), 3);
  g.add(mesh);

  const marshal = body.clone();
  const gate = latLonToWorld(40.6438, -73.7824);
  marshal.position.set(gate.x + 18, elevationAt(gate.x, gate.z), gate.z + 8);
  marshal.scale.setScalar(1.05);
  g.add(marshal);
  g.userData.marshal = marshal;
  return g;
}

export function createGroundVehicles(): THREE.Group {
  const g = new THREE.Group();
  const carGeo = new THREE.BoxGeometry(4.2, 1.4, 1.8);
  const cabGeo = new THREE.BoxGeometry(1.8, 1.1, 1.7);
  const mat = paint(0x2a55c8, 0.4, 0.25);
  const n = 220;
  const cars = new THREE.InstancedMesh(carGeo, mat, n);
  const cabs = new THREE.InstancedMesh(cabGeo, paint(0x111418, 0.35, 0.2), n);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(21);
  for (let i = 0; i < n; i++) {
    const along = rng() * 18000 - 4000;
    const x = 400 + along * 0.15 + (rng() - 0.5) * 40;
    const z = -2000 + along;
    dummy.position.set(x, elevationAt(x, z) + 0.8, z);
    dummy.rotation.y = 0.2;
    dummy.updateMatrix();
    cars.setMatrixAt(i, dummy.matrix);
    dummy.position.y += 0.9;
    dummy.position.x += 0.4;
    dummy.updateMatrix();
    cabs.setMatrixAt(i, dummy.matrix);
  }
  cars.castShadow = true;
  g.add(cars, cabs);

  const tug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.6), paint(0xffbf3f, 0.5, 0.1));
  const gp = latLonToWorld(40.6438, -73.7824);
  tug.position.set(gp.x + 30, elevationAt(gp.x, gp.z) + 0.7, gp.z + 12);
  g.add(tug);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 1.4), paint(0xe31837, 0.5, 0.08));
  belt.position.set(gp.x + 42, elevationAt(gp.x, gp.z) + 0.7, gp.z + 6);
  g.add(belt);
  return g;
}
