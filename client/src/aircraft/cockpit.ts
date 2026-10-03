import * as THREE from "three";
import { glass, metal, paint, std } from "../render/materials";
import { cabinFloorTexture, panelTexture } from "../render/textures";
import { GlassCockpit } from "./instruments";
import { rad } from "../util/math";

export interface CockpitRig {
  group: THREE.Group;
  cameraAnchor: THREE.Object3D;
  yoke: THREE.Object3D;
  throttleL: THREE.Object3D;
  throttleR: THREE.Object3D;
}

export function createCockpit(glassCockpit: GlassCockpit): CockpitRig {
  const group = new THREE.Group();
  group.name = "cockpit";

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.06, 5.2),
    std({ map: cabinFloorTexture(), color: 0x22262c, roughness: 0.85 }),
  );
  floor.position.set(0, -0.55, 16.4);
  group.add(floor);

  const glare = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 0.7), paint(0x2a3038, 0.55, 0.1));
  glare.position.set(0, 0.72, 17.15);
  glare.rotation.x = rad(-18);
  group.add(glare);

  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 0.18), std({ map: panelTexture(), roughness: 0.6 }));
  dash.position.set(0, 0.18, 17.05);
  dash.rotation.x = rad(-12);
  group.add(dash);

  const screenMat = (map: THREE.Texture) =>
    new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: 0xffffff,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.1,
    });

  const pfd = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), screenMat(glassCockpit.pfdTex));
  pfd.position.set(-0.62, 0.42, 16.97);
  pfd.rotation.x = rad(-6);
  const nd = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), screenMat(glassCockpit.ndTex));
  nd.position.set(-0.08, 0.42, 16.97);
  nd.rotation.x = rad(-6);
  const eicas = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), screenMat(glassCockpit.eicasTex));
  eicas.position.set(0.48, 0.42, 16.97);
  eicas.rotation.x = rad(-6);
  group.add(pfd, nd, eicas);

  const mcp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.22), metal(0x3a4048, 0.4, 0.4));
  mcp.position.set(0, 0.62, 16.92);
  group.add(mcp);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 1.6), paint(0x2c323a, 0.55, 0.08));
  pedestal.position.set(0, -0.18, 15.7);
  group.add(pedestal);

  const throttleL = makeThrottle();
  throttleL.position.set(-0.12, 0.08, 15.85);
  const throttleR = makeThrottle();
  throttleR.position.set(0.12, 0.08, 15.85);
  group.add(throttleL, throttleR);

  const yoke = makeYoke();
  yoke.position.set(-0.52, 0.02, 16.55);
  group.add(yoke);

  group.add(makeSeat(-0.52), makeSeat(0.52));

  const overhead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.4), std({ map: panelTexture(), roughness: 0.5 }));
  overhead.position.set(0, 1.42, 16.3);
  group.add(overhead);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 4.6), paint(0x3e4550, 0.6, 0.05));
  sideL.position.set(-1.55, 0.35, 16.2);
  const sideR = sideL.clone();
  sideR.position.x = 1.55;
  group.add(sideL, sideR);

  const windshieldTint = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), glass(0xa8d8ff, 0.12));
  windshieldTint.position.set(0, 1.12, 17.35);
  windshieldTint.rotation.x = rad(-16);
  group.add(windshieldTint);

  const cameraAnchor = new THREE.Object3D();
  cameraAnchor.position.set(-0.52, 1.08, 16.72);
  group.add(cameraAnchor);

  return { group, cameraAnchor, yoke, throttleL, throttleR };
}

function makeThrottle(): THREE.Group {
  const g = new THREE.Group();
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), metal(0x888f96, 0.3, 0.7));
  lever.position.y = 0.12;
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), paint(0x1b3fa0, 0.4, 0.1));
  knob.position.set(0, 0.24, 0);
  g.add(lever, knob);
  return g;
}

function makeYoke(): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 10), metal(0x889099, 0.35, 0.65));
  col.position.y = -0.15;
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20, Math.PI * 1.2), paint(0x1a1d22, 0.5, 0.15));
  bar.rotation.x = Math.PI / 2;
  bar.position.y = 0.14;
  g.add(col, bar);
  return g;
}

function makeSeat(x: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, -0.15, 15.55);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.5), paint(0x1b3fa0, 0.7, 0.05));
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.7, 0.1), paint(0x16357a, 0.7, 0.05));
  back.position.set(0, 0.35, -0.22);
  g.add(cushion, back);
  return g;
}
