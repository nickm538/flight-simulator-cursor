import * as THREE from "three";
import { B738, SOUTHWEST } from "./constants";
import { FlightModel } from "./flightModel";
import { glass, metal, paint, rubber, std } from "../render/materials";
import { engineTexture, liveryTexture, tailHeartTexture, wingTexture } from "../render/textures";
import { clamp, rad } from "../util/math";

export interface AircraftRig {
  root: THREE.Group;
  fans: THREE.Group[];
  wheels: THREE.Object3D[];
  noseGear: THREE.Group;
  leftMain: THREE.Group;
  rightMain: THREE.Group;
  elevators: THREE.Object3D[];
  rudder: THREE.Object3D;
  aileronL: THREE.Object3D;
  aileronR: THREE.Object3D;
  flaps: THREE.Object3D[];
  spoilers: THREE.Object3D[];
  slats: THREE.Object3D[];
  throttles: THREE.Object3D[];
  strobeL: THREE.PointLight;
  strobeR: THREE.PointLight;
  beacon: THREE.PointLight;
  landingL: THREE.SpotLight;
  landingR: THREE.SpotLight;
  taxiLight: THREE.SpotLight;
  navL: THREE.PointLight;
  navR: THREE.PointLight;
  heat: THREE.Mesh[];
}

export function createBoeing737(kind: "southwest" | "generic" = "southwest"): AircraftRig {
  const root = new THREE.Group();
  root.name = "B738";

  const liv = liveryTexture();
  const bodyMat = paint(kind === "southwest" ? SOUTHWEST.white : 0xf2f4f6, 0.28, 0.22);
  bodyMat.map = liv;
  bodyMat.roughnessMap = liv;

  const fuselage = buildFuselage(bodyMat);
  root.add(fuselage);
  root.add(buildFairing());
  root.add(buildNoseGlass());

  const wing = buildWingSet();
  root.add(wing.group);

  const tail = buildTail(kind);
  root.add(tail.group);

  const engL = buildEngine(-1);
  const engR = buildEngine(1);
  root.add(engL.group, engR.group);

  const gear = buildGear();
  root.add(gear.nose, gear.left, gear.right);

  const lights = addLights(root);
  root.add(buildAntennas());
  root.add(buildStaticDetails());

  return {
    root,
    fans: [engL.fan, engR.fan],
    wheels: gear.wheels,
    noseGear: gear.nose,
    leftMain: gear.left,
    rightMain: gear.right,
    elevators: tail.elevators,
    rudder: tail.rudder,
    aileronL: wing.aileronL,
    aileronR: wing.aileronR,
    flaps: wing.flaps,
    spoilers: wing.spoilers,
    slats: wing.slats,
    throttles: [],
    strobeL: lights.strobeL,
    strobeR: lights.strobeR,
    beacon: lights.beacon,
    landingL: lights.landingL,
    landingR: lights.landingR,
    taxiLight: lights.taxi,
    navL: lights.navL,
    navR: lights.navR,
    heat: [engL.heat, engR.heat],
  };
}

function buildFuselage(mat: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  const profile: [number, number][] = [
    [-19.72, 0.08],
    [-19.4, 0.42],
    [-18.6, 0.95],
    [-17.4, 1.45],
    [-16.0, 1.78],
    [-14.2, 1.88],
    [-8.0, 1.88],
    [0.0, 1.88],
    [8.0, 1.88],
    [12.4, 1.88],
    [14.6, 1.84],
    [16.2, 1.62],
    [17.4, 1.28],
    [18.3, 0.9],
    [18.95, 0.52],
    [19.4, 0.22],
    [19.72, 0.03],
  ];
  for (const [y, r] of profile) pts.push(new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 64);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildFairing(): THREE.Mesh {
  const g = new THREE.SphereGeometry(2.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(3.6, 0.55, 2.2);
  const m = new THREE.Mesh(g, paint(0xd8dde3, 0.4, 0.15));
  m.position.set(0, -1.55, 0.2);
  m.castShadow = true;
  return m;
}

function buildNoseGlass(): THREE.Group {
  const g = new THREE.Group();
  const mat = glass(0x9fd4ff, 0.55);
  const pane = new THREE.BoxGeometry(1.55, 0.72, 0.08);
  const l = new THREE.Mesh(pane, mat);
  l.position.set(-0.72, 1.15, 17.05);
  l.rotation.y = rad(18);
  l.rotation.x = rad(-18);
  const r = l.clone();
  r.position.x *= -1;
  r.rotation.y *= -1;
  g.add(l, r);
  const side = new THREE.BoxGeometry(0.08, 0.7, 1.1);
  const sl = new THREE.Mesh(side, mat);
  sl.position.set(-1.72, 1.05, 16.1);
  sl.rotation.y = rad(8);
  const sr = sl.clone();
  sr.position.x *= -1;
  sr.rotation.y *= -1;
  g.add(sl, sr);
  const frame = metal(0x1a1d22, 0.4, 0.6);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), frame);
  bar.position.set(0, 1.18, 17.12);
  bar.rotation.x = rad(-18);
  g.add(bar);
  return g;
}

function buildWingSet() {
  const group = new THREE.Group();
  const { mesh: left, aileron: aileronL, flaps: flapsL, spoilers: spoilersL, slats: slatsL } = buildWing(-1);
  const { mesh: right, aileron: aileronR, flaps: flapsR, spoilers: spoilersR, slats: slatsR } = buildWing(1);
  group.add(left, right);
  return {
    group,
    aileronL,
    aileronR,
    flaps: [...flapsL, ...flapsR],
    spoilers: [...spoilersL, ...spoilersR],
    slats: [...slatsL, ...slatsR],
  };
}

function buildWing(side: number) {
  const group = new THREE.Group();
  const span = 16.4;
  const rootC = 7.5;
  const tipC = 1.7;
  const sweep = Math.tan(rad(B738.wingSweepDeg));
  const geo = new THREE.BoxGeometry(span, 0.42, rootC, 18, 3, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i);
    const y0 = pos.getY(i);
    const z0 = pos.getZ(i);
    const t = (x0 + span / 2) / span;
    const chord = rootC + (tipC - rootC) * t;
    const z = z0 * (chord / rootC) - sweep * (x0 + span / 2) * 0.85;
    const thick = 0.55 + (0.14 - 0.55) * t;
    const y = y0 * (thick / 0.42);
    pos.setXYZ(i, x0, y, z);
  }
  geo.computeVertexNormals();
  const mat = paint(SOUTHWEST.greyWing, 0.38, 0.35);
  mat.map = wingTexture();
  const wing = new THREE.Mesh(geo, mat);
  wing.position.set(side * (span / 2 + 1.7), -0.35, -1.1);
  wing.rotation.z = rad(B738.dihedralDeg * side);
  wing.castShadow = true;
  wing.receiveShadow = true;
  group.add(wing);

  const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 1.15), paint(SOUTHWEST.white, 0.3, 0.2));
  winglet.position.set(side * (span + 1.55), 0.85, -8.4);
  winglet.rotation.z = rad(-18 * side);
  winglet.rotation.y = rad(8 * side);
  winglet.castShadow = true;
  group.add(winglet);

  const aileron = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.85), metal(0x8a9298, 0.45, 0.4));
  aileron.position.set(side * (span - 1.2), -0.28, -6.35);
  aileron.castShadow = true;
  group.add(aileron);

  const flaps: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.07, 1.15), metal(0x7b838a, 0.5, 0.3));
    f.position.set(side * (4.2 + i * 3.5), -0.55, -4.3);
    group.add(f);
    flaps.push(f);
    const canoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.6, 6, 10), paint(0xc5ccd2, 0.35, 0.25));
    canoe.rotation.x = Math.PI / 2;
    canoe.position.set(side * (4.2 + i * 3.5), -0.78, -3.4);
    group.add(canoe);
  }

  const spoilers: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.7), paint(0x555b60, 0.5, 0.2));
    s.position.set(side * (3.8 + i * 2.4), -0.08, -3.6);
    group.add(s);
    spoilers.push(s);
  }

  const slats: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.42), metal(0x9aa3aa, 0.4, 0.45));
    s.position.set(side * (3.4 + i * 3.2), -0.22, 1.55 - i * 0.55);
    group.add(s);
    slats.push(s);
  }

  const lightPod = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), std({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.8 }));
  lightPod.position.set(side * 3.2, -0.7, 0.6);
  group.add(lightPod);

  return { mesh: group, aileron, flaps, spoilers, slats };
}

function buildTail(kind: "southwest" | "generic") {
  const group = new THREE.Group();
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.1, 4.2), paint(SOUTHWEST.white, 0.3, 0.18));
  fin.position.set(0, 3.55, -17.1);
  fin.castShadow = true;
  const heart = tailHeartTexture();
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshStandardMaterial({ map: heart, transparent: true, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
  );
  decal.position.set(0.15, 3.7, -17.0);
  decal.rotation.y = Math.PI / 2;
  const decal2 = decal.clone();
  decal2.position.x = -0.15;
  decal2.rotation.y = -Math.PI / 2;
  group.add(fin, decal, decal2);
  if (kind !== "southwest") {
    (decal.material as THREE.MeshStandardMaterial).visible = false;
    (decal2.material as THREE.MeshStandardMaterial).visible = false;
  }

  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 1.15), paint(0xe8eaee, 0.32, 0.15));
  rudder.position.set(0, 3.5, -19.05);
  group.add(rudder);

  const stab = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.22, 3.3), paint(SOUTHWEST.greyWing, 0.36, 0.3));
  stab.position.set(0, 4.55, -17.35);
  stab.castShadow = true;
  group.add(stab);

  const el = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.08, 0.9), metal(0x889098, 0.45, 0.35));
  el.position.set(-3.6, 4.55, -18.7);
  const er = el.clone();
  er.position.x = 3.6;
  group.add(el, er);

  const apu = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 12), metal(0x333333, 0.4, 0.7));
  apu.rotation.x = Math.PI / 2;
  apu.position.set(0, 0.15, -19.55);
  group.add(apu);

  return { group, rudder, elevators: [el, er] };
}

function buildEngine(side: number) {
  const group = new THREE.Group();
  group.position.set(side * B738.engineOffsetX, B738.engineOffsetY, B738.engineOffsetZ);

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 2.4), paint(0xd5dae0, 0.35, 0.2));
  pylon.position.set(0, 1.05, -0.2);
  group.add(pylon);

  const nacelleMat = paint(0xe4e8ee, 0.28, 0.25);
  nacelleMat.map = engineTexture();
  const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.92, 3.6, 32, 1, true), nacelleMat);
  nacelle.rotation.x = Math.PI / 2;
  nacelle.castShadow = true;
  group.add(nacelle);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.14, 12, 32), metal(0xf2f4f6, 0.18, 0.55));
  lip.position.z = 1.85;
  group.add(lip);

  const fan = new THREE.Group();
  fan.position.z = 1.52;
  const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), metal(0xd0d5da, 0.22, 0.7));
  spinner.scale.z = 1.6;
  fan.add(spinner);
  const bladeMat = metal(0xe8eef4, 0.18, 0.88);
  for (let i = 0; i < B738.fanBlades; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.82, 0.22), bladeMat);
    blade.position.y = 0.46;
    const holder = new THREE.Group();
    holder.rotation.z = (i / B738.fanBlades) * Math.PI * 2;
    holder.add(blade);
    fan.add(holder);
  }
  group.add(fan);

  const booster = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide }),
  );
  booster.position.z = 1.22;
  group.add(booster);
  const inletLight = new THREE.PointLight(0xcfe8ff, 1.6, 4);
  inletLight.position.z = 2.1;
  group.add(inletLight);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 1.4, 16), metal(0x666b70, 0.4, 0.7));
  core.rotation.x = Math.PI / 2;
  core.position.z = -0.6;
  group.add(core);

  const mixer = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.7, 12), metal(0x4a4e52, 0.4, 0.65));
  mixer.rotation.x = Math.PI / 2;
  mixer.position.z = -1.85;
  group.add(mixer);

  const heat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 1.8, 12),
    new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.08, depthWrite: false }),
  );
  heat.rotation.x = Math.PI / 2;
  heat.position.z = -2.7;
  group.add(heat);

  const chevron = metal(0x33383c, 0.45, 0.5);
  for (let i = 0; i < 12; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), chevron);
    const a = (i / 12) * Math.PI * 2;
    t.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -2.2);
    t.rotation.x = Math.PI / 2;
    group.add(t);
  }

  return { group, fan, heat };
}

function buildGear() {
  const wheels: THREE.Object3D[] = [];
  const nose = new THREE.Group();
  nose.position.set(0, -1.15, B738.noseGearZ);
  const nStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.1, 10), metal(0xc9ced3, 0.3, 0.75));
  nStrut.position.y = -0.7;
  nose.add(nStrut);
  const nFork = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.16), metal(0xb7bcc2, 0.32, 0.7));
  nFork.position.y = -1.72;
  nose.add(nFork);
  const nw1 = makeWheel(B738.noseWheelRadius, 0.16, 5);
  const nw2 = nw1.clone();
  nw1.position.set(-0.22, -1.72, 0);
  nw2.position.set(0.22, -1.72, 0);
  nose.add(nw1, nw2);
  wheels.push(nw1, nw2);
  const nDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.3, 0.04), paint(0xdde1e6, 0.4, 0.15));
  nDoorL.position.set(-0.38, -0.5, 0);
  const nDoorR = nDoorL.clone();
  nDoorR.position.x = 0.38;
  nose.add(nDoorL, nDoorR);

  const left = makeMainGear(-1, wheels);
  const right = makeMainGear(1, wheels);
  return { nose, left, right, wheels };
}

function makeMainGear(side: number, wheels: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(side * B738.mainGearX, -1.05, B738.mainGearZ);
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.35, 12), metal(0xcdd2d7, 0.28, 0.75));
  strut.position.y = -0.7;
  g.add(strut);
  const truck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.7), metal(0x9aa0a6, 0.35, 0.65));
  truck.position.y = -1.85;
  g.add(truck);
  const w1 = makeWheel(B738.wheelRadius, 0.22, 5);
  const w2 = w1.clone();
  w1.position.set(side * 0.28, -1.85, 0.22);
  w2.position.set(side * 0.28, -1.85, -0.22);
  g.add(w1, w2);
  wheels.push(w1, w2);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.05), paint(0xe2e6ea, 0.38, 0.15));
  door.position.set(side * 0.7, -0.4, 0);
  g.add(door);
  const torque = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.18), metal(0x889099, 0.4, 0.6));
  torque.position.set(0, -1.2, 0.18);
  g.add(torque);
  return g;
}

function makeWheel(radius: number, width: number, spokes: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, radius * 0.28, 10, 24), rubber());
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width * 0.7, 16), metal(0xdfe3e8, 0.25, 0.8));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const spokeMat = metal(0xf7f9fc, 0.18, 0.92);
  for (let i = 0; i < spokes; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, radius * 0.9, 0.07), spokeMat);
    s.rotation.z = (i / spokes) * Math.PI * 2;
    g.add(s);
  }
  g.castShadow = true;
  return g;
}

function addLights(root: THREE.Group) {
  const strobeL = new THREE.PointLight(0xffffff, 0, 80);
  strobeL.position.set(-17.6, 0.9, -8.2);
  const strobeR = strobeL.clone();
  strobeR.position.x *= -1;
  const beacon = new THREE.PointLight(0xff2020, 0, 40);
  beacon.position.set(0, 7.2, -17.1);
  const navL = new THREE.PointLight(0xff2020, 1.2, 18);
  navL.position.set(-17.5, -0.1, -7.8);
  const navR = new THREE.PointLight(0x20ff40, 1.2, 18);
  navR.position.set(17.5, -0.1, -7.8);
  const landingL = new THREE.SpotLight(0xfff3d0, 0, 420, rad(12), 0.35, 0.35);
  landingL.position.set(-5.6, -1.2, 1.2);
  landingL.target.position.set(-5.6, -8, 80);
  const landingR = landingL.clone();
  landingR.position.x *= -1;
  landingR.target.position.x *= -1;
  const taxi = new THREE.SpotLight(0xfff1c8, 0, 120, rad(18), 0.4, 0.4);
  taxi.position.set(0, -1.4, 12.6);
  taxi.target.position.set(0, -4, 40);
  root.add(strobeL, strobeR, beacon, navL, navR, landingL, landingR, taxi);
  root.add(landingL.target, landingR.target, taxi.target);
  const noseLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), std({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 2 }));
  noseLight.position.set(0, -0.9, 19.2);
  root.add(noseLight);
  return { strobeL, strobeR, beacon, navL, navR, landingL, landingR, taxi };
}

function buildAntennas(): THREE.Group {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.22), paint(0x22262b, 0.5, 0.2));
  blade.position.set(0, 2.05, 4.5);
  const blade2 = blade.clone();
  blade2.position.z = -6.5;
  g.add(blade, blade2);
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), metal(0xcccccc, 0.3, 0.8));
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(-1.7, 0.35, 16.4);
  g.add(pitot, pitot.clone().translateX(3.4));
  return g;
}

function buildStaticDetails(): THREE.Group {
  const g = new THREE.Group();
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 0.95), paint(0xe8ecef, 0.35, 0.15));
  door.position.set(-1.9, 0.2, 13.6);
  g.add(door);
  const door2 = door.clone();
  door2.position.z = -8.5;
  g.add(door2);
  const overwing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.7), paint(0xdde2e8));
  overwing.position.set(-1.9, 0.35, 1.2);
  g.add(overwing, overwing.clone().translateZ(-2.2));
  return g;
}

export function updateAircraftVisual(rig: AircraftRig, fm: FlightModel, dt: number, time: number) {
  rig.root.position.copy(fm.position);
  rig.root.quaternion.copy(fm.quaternion);

  const fanSpeed = (fm.n1[0] / 100) * 42;
  rig.fans[0].rotation.z += fanSpeed * dt * Math.PI * 2;
  rig.fans[1].rotation.z += (fm.n1[1] / 100) * 42 * dt * Math.PI * 2;

  for (const w of rig.wheels) {
    w.rotation.x += fm.wheelOmega[0] * dt * (fm.onGround ? 1 : 0.15);
  }

  const gearT = fm.gearActual;
  rig.noseGear.rotation.x = rad((1 - gearT) * 95);
  rig.leftMain.rotation.z = rad((1 - gearT) * -95);
  rig.rightMain.rotation.z = rad((1 - gearT) * 95);
  rig.noseGear.visible = gearT > 0.02;
  rig.leftMain.visible = gearT > 0.02;
  rig.rightMain.visible = gearT > 0.02;

  const elev = clamp(fm.controls.elevator + fm.controls.trim, -1, 1);
  for (const e of rig.elevators) e.rotation.x = rad(-elev * 22);
  rig.rudder.rotation.y = rad(-fm.controls.rudder * 25);
  rig.aileronL.rotation.x = rad(fm.controls.aileron * 22);
  rig.aileronR.rotation.x = rad(-fm.controls.aileron * 22);

  const flapAng = rad(fm.flapsActual * 0.95);
  for (const f of rig.flaps) {
    f.rotation.x = flapAng;
    f.position.y = -0.55 - fm.flapsActual * 0.012;
    f.position.z = -4.3 - fm.flapsActual * 0.012;
  }
  const slat = fm.flapsActual >= 1 ? 1 : 0;
  for (const s of rig.slats) {
    s.position.y = -0.22 + slat * 0.15;
    s.rotation.x = rad(-slat * 18);
  }
  const sp = fm.controls.spoiler;
  for (const s of rig.spoilers) s.rotation.x = rad(-sp * 45);

  const strobe = fm.lights.strobe && Math.floor(time * 1.6) % 2 === 0 ? 8 : 0;
  rig.strobeL.intensity = strobe;
  rig.strobeR.intensity = strobe;
  rig.beacon.intensity = fm.lights.beacon && Math.sin(time * 8) > 0 ? 6 : 0;
  rig.landingL.intensity = fm.lights.landing ? 18 : 0;
  rig.landingR.intensity = fm.lights.landing ? 18 : 0;
  rig.taxiLight.intensity = fm.lights.taxi ? 8 : 0;
  rig.navL.intensity = fm.lights.nav ? 2 : 0;
  rig.navR.intensity = fm.lights.nav ? 2 : 0;

  for (let i = 0; i < rig.heat.length; i++) {
    const m = rig.heat[i].material as THREE.MeshBasicMaterial;
    m.opacity = 0.04 + (fm.n1[i] / 100) * 0.18;
    rig.heat[i].scale.setScalar(0.9 + fm.n1[i] / 140);
  }
}
