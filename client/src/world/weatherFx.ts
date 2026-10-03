import * as THREE from "three";
import type { WeatherState } from "../aircraft/flightModel";
import { clamp } from "../util/math";

export function createClouds(weather: WeatherState): THREE.Group {
  const g = new THREE.Group();
  g.name = "clouds";
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const n = Math.floor(40 + weather.cloudCover * 90);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set((Math.random() - 0.5) * 40000, weather.cloudBaseM + Math.random() * 900, (Math.random() - 0.5) * 40000);
    dummy.scale.set(220 + Math.random() * 280, 90 + Math.random() * 110, 180 + Math.random() * 260);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  g.add(mesh);
  return g;
}

export function createPrecipitation(weather: WeatherState): THREE.Points {
  const count = weather.precip > 0.05 ? 8000 : 1;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 400;
    pos[i * 3 + 1] = Math.random() * 220;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xcfe8ff,
    size: 0.18,
    transparent: true,
    opacity: clamp(weather.precip, 0, 0.8),
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = weather.precip > 0.05;
  return pts;
}

export function updatePrecipitation(pts: THREE.Points, dt: number, origin: THREE.Vector3, weather: WeatherState) {
  pts.position.copy(origin);
  if (!pts.visible) return;
  const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) - dt * (18 + weather.precip * 24);
    if (y < 0) y = 220;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
}

export function createExhaust(): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const n = 400;
  const pos = new Float32Array(n * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xc8d0d6, size: 0.35, transparent: true, opacity: 0.25, depthWrite: false });
  return new THREE.Points(geo, mat);
}
