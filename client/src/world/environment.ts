import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { WORLD } from "../aircraft/constants";
import { elevationAt, isLand } from "./land";
import { asphaltTexture, concreteTexture, grassTexture } from "../render/textures";
import { paint, std } from "../render/materials";

export function createTerrain(): THREE.Mesh {
  const segs = WORLD.terrainSegs;
  const size = WORLD.sizeM;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(0x3f7a3c);
  const sand = new THREE.Color(0xc2b280);
  const rock = new THREE.Color(0x6d6a63);
  const city = new THREE.Color(0x6a6e72);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const land = isLand(x, z);
    const y = land ? elevationAt(x, z) : -2.2;
    pos.setY(i, y);
    if (!land) c.set(0x1b4c6e);
    else if (y < 2.2) c.copy(sand);
    else if (Math.abs(x) < 4000 && Math.abs(z) < 4000) c.copy(city);
    else if (y > 40) c.copy(rock);
    else c.copy(grass);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = std({
    vertexColors: true,
    map: grassTexture(),
    roughness: 0.92,
    metalness: 0.02,
  });
  mat.map!.repeat.set(180, 180);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function createWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(WORLD.sizeM * 1.15, WORLD.sizeM * 1.15, 16, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(0x0a3a58) },
      uColorShallow: { value: new THREE.Color(0x1c6f8f) },
      uSun: { value: new THREE.Vector3(0.4, 0.8, 0.2) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * 0.01 + uTime * 0.6) * 0.25 + cos(p.z * 0.013 + uTime * 0.45) * 0.2;
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorDeep;
      uniform vec3 uColorShallow;
      uniform vec3 uSun;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        float n = sin(vPos.x * 0.02 + uTime) * 0.5 + cos(vPos.z * 0.017 + uTime * 0.7) * 0.5;
        vec3 col = mix(uColorDeep, uColorShallow, 0.35 + n * 0.15);
        float spec = pow(max(0.0, dot(normalize(vec3(n, 1.0, n)), normalize(uSun))), 40.0);
        col += vec3(0.85, 0.9, 1.0) * spec * 0.35;
        gl_FragColor = vec4(col, 0.92);
      }
    `,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.05;
  mesh.renderOrder = 1;
  return mesh;
}

export function createSky(renderer: THREE.WebGLRenderer, shadows = true) {
  const sky = new Sky();
  sky.scale.setScalar(WORLD.sizeM * 2);
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 3.2;
  uniforms.rayleigh.value = 1.35;
  uniforms.mieCoefficient.value = 0.004;
  uniforms.mieDirectionalG.value = 0.8;
  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(82);
  const theta = THREE.MathUtils.degToRad(168);
  sun.setFromSphericalCoords(1, phi, theta);
  uniforms.sunPosition.value.copy(sun);

  const hemi = new THREE.HemisphereLight(0x9ec9ff, 0x3d4a32, 0.7);
  const dir = new THREE.DirectionalLight(0xfff1d0, shadows ? 2.15 : 1.4);
  dir.position.copy(sun).multiplyScalar(4000);
  dir.castShadow = shadows;
  if (shadows) {
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 100;
    dir.shadow.camera.far = 12000;
    dir.shadow.camera.left = -2500;
    dir.shadow.camera.right = 2500;
    dir.shadow.camera.top = 2500;
    dir.shadow.camera.bottom = -2500;
    dir.shadow.bias = -0.00015;
  }

  let env: THREE.Texture | null = null;
  if (shadows) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    env = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }

  return { sky, sun, hemi, dir, env, uniforms };
}

export const groundTextures = {
  asphalt: asphaltTexture,
  concrete: concreteTexture,
};
