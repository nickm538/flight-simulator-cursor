import * as THREE from "three";
import { SOUTHWEST } from "../aircraft/constants";

const cache = new Map<string, THREE.Texture>();

export function canvasTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function liveryTexture(): THREE.CanvasTexture {
  return canvasTexture("livery", 2048, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f4f6f8";
    ctx.fillRect(0, 0, w, h);

    const belly = ctx.createLinearGradient(0, h * 0.55, 0, h);
    belly.addColorStop(0, "#dfe4ea");
    belly.addColorStop(1, "#9aa3ad");
    ctx.fillStyle = belly;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);

    ctx.fillStyle = "#e8edf2";
    ctx.fillRect(0, h * 0.58, w, 8);

    const windowY = h * 0.42;
    for (let i = 0; i < 42; i++) {
      const x = w * 0.18 + i * 38;
      roundRect(ctx, x, windowY, 22, 16, 4);
      const g = ctx.createLinearGradient(x, windowY, x, windowY + 16);
      g.addColorStop(0, "#8fd4ff");
      g.addColorStop(0.45, "#16324a");
      g.addColorStop(1, "#071018");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = "#c9d0d6";
    roundRect(ctx, w * 0.09, h * 0.36, 46, 70, 8);
    ctx.fill();
    roundRect(ctx, w * 0.72, h * 0.38, 36, 52, 6);
    ctx.fill();
    roundRect(ctx, w * 0.86, h * 0.4, 28, 40, 6);
    ctx.fill();

    ctx.save();
    ctx.translate(w * 0.28, h * 0.28);
    ctx.fillStyle = "#1b3fa0";
    ctx.font = "bold 92px 'Segoe UI', Helvetica, Arial, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("SOUTHWEST", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#5b6570";
    ctx.font = "600 28px 'Segoe UI', Helvetica, Arial, sans-serif";
    ctx.fillText("N8642H", w * 0.78, h * 0.22);

    ctx.fillStyle = "rgba(20,30,40,0.12)";
    for (let i = 0; i < 18; i++) {
      ctx.fillRect(w * 0.12 + i * 90, h * 0.7, 70, 6);
    }
  });
}

export function tailHeartTexture(): THREE.CanvasTexture {
  return canvasTexture("tail-heart", 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f7f8fb";
    ctx.fillRect(0, 0, w, h);

    drawHeart(ctx, w * 0.5, h * 0.52, w * 0.34, "#e31837");
    drawHeart(ctx, w * 0.46, h * 0.5, w * 0.26, "#ffbf3f");
    drawHeart(ctx, w * 0.5, h * 0.54, w * 0.2, "#2ea3e6");
    drawHeart(ctx, w * 0.51, h * 0.5, w * 0.12, "#1b3fa0");

    ctx.fillStyle = "#1b3fa0";
    ctx.font = "bold 64px 'Segoe UI', Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SOUTHWEST", w / 2, h * 0.14);
  });
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-80, -20, -40, -80, 0, -40);
  ctx.bezierCurveTo(40, -80, 80, -20, 0, 30);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function wingTexture(): THREE.CanvasTexture {
  return canvasTexture("wing", 1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#c5ccd3");
    g.addColorStop(0.5, "#9aa3ab");
    g.addColorStop(1, "#7d868e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, h * 0.15, w, 8);
    ctx.fillStyle = "#1b3fa0";
    ctx.fillRect(w * 0.08, h * 0.55, w * 0.18, h * 0.22);
    ctx.fillStyle = "#e31837";
    ctx.fillRect(w * 0.28, h * 0.55, w * 0.1, h * 0.22);
    ctx.fillStyle = "#ffbf3f";
    ctx.fillRect(w * 0.4, h * 0.55, w * 0.08, h * 0.22);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 12; i++) ctx.fillRect(w * 0.5 + i * 36, h * 0.3, 18, h * 0.5);
  });
}

export function engineTexture(): THREE.CanvasTexture {
  return canvasTexture("engine", 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#dfe4ea");
    g.addColorStop(0.4, "#b7c0c8");
    g.addColorStop(1, "#8b949c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = SOUTHWEST.canyonBlue.toString(16);
    ctx.fillStyle = "#1b3fa0";
    ctx.fillRect(0, h * 0.42, w, 18);
    ctx.fillStyle = "#e31837";
    ctx.fillRect(0, h * 0.46, w, 10);
    ctx.fillStyle = "#ffbf3f";
    ctx.fillRect(0, h * 0.48, w, 8);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(0, 0, w, 20);
  });
}

export function runwayTexture(): THREE.CanvasTexture {
  return canvasTexture(
    "runway",
    256,
    2048,
    (ctx, w, h) => {
      ctx.fillStyle = "#5a5d62";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) {
        const n = (Math.sin(y * 12.9898) * 43758.5453) % 1;
        ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.abs(n) * 0.05})`;
        ctx.fillRect(0, y, w, 8);
      }
      ctx.fillStyle = "#d8dbe0";
      ctx.fillRect(w * 0.48, 0, w * 0.04, h);
      ctx.fillStyle = "#e8eaee";
      ctx.fillRect(6, 0, 10, h);
      ctx.fillRect(w - 16, 0, 10, h);
    },
    1,
    8,
  );
}

export function asphaltTexture(): THREE.CanvasTexture {
  return canvasTexture("asphalt", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#3d4045";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${80 + (i % 40)},${80 + (i % 30)},${80},0.15)`;
      ctx.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    }
  }, 24, 24);
}

export function grassTexture(): THREE.CanvasTexture {
  return canvasTexture("grass", 256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#3e7a3a");
    g.addColorStop(1, "#2f5e2c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      ctx.strokeStyle = `rgba(20,80,20,${0.15 + (i % 5) * 0.05})`;
      const x = (i * 17) % w;
      const y = (i * 29) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1, y - 4);
      ctx.stroke();
    }
  }, 40, 40);
}

export function concreteTexture(): THREE.CanvasTexture {
  return canvasTexture("concrete", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#8b8f94";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(60,60,60,0.25)";
    ctx.strokeRect(2, 2, w - 4, h - 4);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 7) * 0.01})`;
      ctx.fillRect((i * 41) % w, (i * 19) % h, 12, 8);
    }
  }, 8, 8);
}

export function facadeTexture(seed: number): THREE.CanvasTexture {
  return canvasTexture(`facade-${seed % 8}`, 256, 512, (ctx, w, h) => {
    const palettes = [
      ["#c4b7a5", "#1a2430", "#e8efe8"],
      ["#8aa4b8", "#0e1a24", "#d7e6f0"],
      ["#6b3f32", "#1b120e", "#f0d9b5"],
      ["#d9d3c7", "#20242c", "#8ca3b0"],
      ["#3d4c5c", "#0b1118", "#9ec4d8"],
      ["#b9c2c8", "#111820", "#e6eef2"],
      ["#5c6e58", "#10140f", "#d5e0c8"],
      ["#8e6b4a", "#1a120c", "#f3e1c4"],
    ];
    const p = palettes[seed % palettes.length];
    ctx.fillStyle = p[0];
    ctx.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 14;
    const ww = 22;
    const hh = 18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 18 + c * 38;
        const y = 16 + r * 34;
        const lit = ((r * 13 + c * 7 + seed) % 9) > 3;
        ctx.fillStyle = lit ? p[2] : p[1];
        ctx.fillRect(x, y, ww, hh);
        if (lit) {
          ctx.fillStyle = "rgba(255, 220, 140, 0.35)";
          ctx.fillRect(x, y, ww, 4);
        }
      }
    }
  }, 1, 1);
}

export function cabinFloorTexture(): THREE.CanvasTexture {
  return canvasTexture("floor", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1c1f24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a3038";
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 2);
  }, 4, 8);
}

export function panelTexture(): THREE.CanvasTexture {
  return canvasTexture("panel", 512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2b2f36";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#3a404a";
    for (let i = 0; i < 40; i++) {
      const x = 12 + (i % 10) * 48;
      const y = 20 + Math.floor(i / 10) * 56;
      roundRect(ctx, x, y, 36, 28, 4);
      ctx.fill();
      ctx.fillStyle = i % 5 === 0 ? "#c9a227" : "#8fd0c0";
      ctx.beginPath();
      ctx.arc(x + 18, y + 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a404a";
    }
  });
}

export function barkTexture(): THREE.CanvasTexture {
  return canvasTexture("bark", 128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#5a3b28";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 17) % w, 0);
      ctx.lineTo((i * 17 + 8) % w, h);
      ctx.stroke();
    }
  }, 1, 2);
}

export function leafTexture(): THREE.CanvasTexture {
  return canvasTexture("leaf", 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = i % 2 ? "#2f7a38" : "#1f5a28";
      ctx.beginPath();
      const x = (i * 47) % w;
      const y = (i * 31) % h;
      ctx.ellipse(x, y, 18, 10, i, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
