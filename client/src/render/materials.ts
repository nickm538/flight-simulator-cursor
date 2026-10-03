import * as THREE from "three";

export function std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    roughness: 0.45,
    metalness: 0.1,
    envMapIntensity: 1.1,
    ...params,
  });
}

export function metal(color: number, roughness = 0.28, metalness = 0.85): THREE.MeshStandardMaterial {
  return std({ color, roughness, metalness });
}

export function paint(color: number, roughness = 0.32, metalness = 0.18): THREE.MeshStandardMaterial {
  return std({ color, roughness, metalness });
}

export function glass(color = 0x7ec8ff, opacity = 0.35): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.72,
    thickness: 0.4,
    transparent: true,
    opacity,
    envMapIntensity: 1.6,
    ior: 1.45,
  });
}

export function rubber(): THREE.MeshStandardMaterial {
  return std({ color: 0x1a1a1a, roughness: 0.92, metalness: 0.02 });
}

export function emissive(color: number, intensity = 2): THREE.MeshStandardMaterial {
  return std({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.1 });
}

export function disposeMats(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!m) return;
    const list = Array.isArray(m) ? m : [m];
    for (const mat of list) mat.dispose();
  });
}
