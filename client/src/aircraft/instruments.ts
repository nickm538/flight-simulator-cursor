import * as THREE from "three";
import { FlightModel } from "./flightModel";
import type { AirportDef } from "./constants";
import { MAG_VAR_WEST } from "./constants";
import { clamp, wrap180, wrap360 } from "../util/math";
import { mToFt } from "../util/math";

export class GlassCockpit {
  pfd: HTMLCanvasElement;
  nd: HTMLCanvasElement;
  eicas: HTMLCanvasElement;
  pfdTex: THREE.CanvasTexture;
  ndTex: THREE.CanvasTexture;
  eicasTex: THREE.CanvasTexture;
  private pfdCtx: CanvasRenderingContext2D;
  private ndCtx: CanvasRenderingContext2D;
  private eicasCtx: CanvasRenderingContext2D;

  constructor() {
    this.pfd = makeCanvas(1024, 1024);
    this.nd = makeCanvas(1024, 1024);
    this.eicas = makeCanvas(1024, 1024);
    this.pfdCtx = this.pfd.getContext("2d")!;
    this.ndCtx = this.nd.getContext("2d")!;
    this.eicasCtx = this.eicas.getContext("2d")!;
    this.pfdTex = tex(this.pfd);
    this.ndTex = tex(this.nd);
    this.eicasTex = tex(this.eicas);
  }

  update(
    fm: FlightModel,
    airports: AirportDef[],
    traffic: { x: number; z: number; hdg: number; alt: number }[],
    locDev = 0,
    gsDev = 0,
  ) {
    this.drawPfd(fm, locDev, gsDev);
    this.drawNd(fm, airports, traffic);
    this.drawEicas(fm);
    this.pfdTex.needsUpdate = true;
    this.ndTex.needsUpdate = true;
    this.eicasTex.needsUpdate = true;
  }

  private drawPfd(fm: FlightModel, locDev: number, gsDev: number) {
    const ctx = this.pfdCtx;
    const w = 1024;
    const h = 1024;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, w, h);

    const cx = 512;
    const cy = 500;
    const pitchPx = 9.5;
    const pitchDeg = (fm.pitch * 180) / Math.PI;
    const bankDeg = (fm.bank * 180) / Math.PI;

    ctx.save();
    ctx.beginPath();
    ctx.rect(220, 120, 584, 620);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-fm.bank);
    ctx.translate(0, pitchDeg * pitchPx);

    ctx.fillStyle = "#3d82c4";
    ctx.fillRect(-800, -1600, 1600, 1600);
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(-800, 0, 1600, 1600);
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(-800, -3, 1600, 6);

    ctx.strokeStyle = "#f4f7fb";
    ctx.fillStyle = "#f4f7fb";
    ctx.lineWidth = 3;
    ctx.font = "28px 'IBM Plex Sans', Arial";
    ctx.textAlign = "right";
    for (let p = -40; p <= 40; p += 5) {
      if (p === 0) continue;
      const y = -p * pitchPx;
      const len = p % 10 === 0 ? 90 : 50;
      ctx.beginPath();
      ctx.moveTo(-len, y);
      ctx.lineTo(len, y);
      ctx.stroke();
      if (p % 10 === 0) {
        ctx.fillText(String(Math.abs(p)), -len - 10, y + 10);
        ctx.textAlign = "left";
        ctx.fillText(String(Math.abs(p)), len + 10, y + 10);
        ctx.textAlign = "right";
      }
    }
    ctx.restore();

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 130, cy);
    ctx.lineTo(cx - 28, cy);
    ctx.moveTo(cx + 28, cy);
    ctx.lineTo(cx + 130, cy);
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy + 18);
    ctx.stroke();
    ctx.strokeStyle = "#ffe14a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 128, cy);
    ctx.lineTo(cx - 30, cy);
    ctx.moveTo(cx + 30, cy);
    ctx.lineTo(cx + 128, cy);
    ctx.stroke();
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, 150);
    ctx.rotate(-fm.bank);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 80, 80, Math.PI + 0.6, -0.6, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, 148);
    ctx.lineTo(cx - 10, 168);
    ctx.lineTo(cx + 10, 168);
    ctx.fill();

    drawTape(ctx, 40, 140, 150, 580, fm.iasKt, 10, "CAS", true);
    drawTape(ctx, 834, 140, 150, 580, fm.altitudeFt, 100, "ALT", false);

    ctx.fillStyle = "#0b0e12";
    ctx.fillRect(400, 760, 224, 70);
    ctx.strokeStyle = "#ffe14a";
    ctx.strokeRect(400, 760, 224, 70);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'IBM Plex Sans', Arial";
    ctx.textAlign = "center";
    ctx.fillText(wrap360(fm.headingMag).toFixed(0).padStart(3, "0"), 512, 808);

    ctx.fillStyle = "#7cffb2";
    ctx.font = "bold 26px 'IBM Plex Sans', Arial";
    ctx.textAlign = "left";
    const fma = [
      fm.ap.at ? "MCP SPD" : "THR",
      fm.ap.hdgSel ? "HDG SEL" : fm.ap.app ? "LOC" : "TO/GA",
      fm.ap.altHld ? "ALT HOLD" : fm.ap.app ? "G/S" : "VNAV PTH",
    ];
    ctx.fillText(fma[0], 230, 100);
    ctx.fillStyle = "#d6a4ff";
    ctx.fillText(fma[1], 430, 100);
    ctx.fillStyle = "#7cc8ff";
    ctx.fillText(fma[2], 640, 100);
    if (fm.ap.master) {
      ctx.fillStyle = "#7cffb2";
      ctx.fillText("CMD", 860, 100);
    }

    ctx.fillStyle = "#ffe14a";
    ctx.font = "24px 'IBM Plex Sans', Arial";
    ctx.textAlign = "right";
    const vs = fm.vsFpm;
    ctx.fillText(`${vs >= 0 ? "+" : ""}${vs.toFixed(0)}`, 980, 430);
    ctx.fillStyle = "#9ad4ff";
    ctx.fillText(`M ${fm.mach.toFixed(3)}`, 200, 96);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`RA ${Math.max(0, mToFt(fm.radioAlt)).toFixed(0)}`, 230, 760);

    if (fm.ap.app || Math.abs(locDev) < 2) {
      const lx = clamp(512 + locDev * 90, 320, 700);
      ctx.fillStyle = "#d6a4ff";
      ctx.fillRect(lx - 8, 720, 16, 16);
      const gy = clamp(500 - gsDev * 80, 180, 700);
      ctx.fillRect(790, gy - 8, 16, 16);
    }

    if (fm.stickShaker) {
      ctx.fillStyle = "rgba(200,20,20,0.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ff3b3b";
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.fillText("STALL", 512, 80);
    }
    void wrap180(bankDeg);
    void pitchDeg;
  }

  private drawNd(fm: FlightModel, airports: AirportDef[], traffic: { x: number; z: number; hdg: number; alt: number }[]) {
    const ctx = this.ndCtx;
    const w = 1024;
    const h = 1024;
    ctx.fillStyle = "#05080c";
    ctx.fillRect(0, 0, w, h);
    const cx = 512;
    const cy = 620;
    const rangeM = 18000;
    const pxPerM = 380 / rangeM;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-fm.headingTrue * Math.PI) / 180);

    ctx.strokeStyle = "#1c3d2a";
    ctx.lineWidth = 2;
    for (const r of [5000, 10000, 15000]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * pxPerM, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const ap of airports) {
      const { x, z } = ll(ap.lat, ap.lon);
      const dx = x - fm.position.x;
      const dz = z - fm.position.z;
      const px = dx * pxPerM;
      const py = dz * pxPerM;
      ctx.fillStyle = "#7cc8ff";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "20px Arial";
      ctx.fillText(ap.icao, px + 8, py - 4);
      for (const rw of ap.runways) {
        const p = ll(rw.lat, rw.lon);
        const hx = Math.sin((rw.trueHeading * Math.PI) / 180);
        const hz = -Math.cos((rw.trueHeading * Math.PI) / 180);
        ctx.strokeStyle = "#cfd6dc";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo((p.x - fm.position.x) * pxPerM, (p.z - fm.position.z) * pxPerM);
        ctx.lineTo((p.x + hx * rw.lengthM - fm.position.x) * pxPerM, (p.z + hz * rw.lengthM - fm.position.z) * pxPerM);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#ff6b6b";
    for (const t of traffic) {
      const px = (t.x - fm.position.x) * pxPerM;
      const py = (t.z - fm.position.z) * pxPerM;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((t.hdg * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 8);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx - 12, cy + 12);
    ctx.lineTo(cx + 12, cy + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText(wrap360(fm.headingMag).toFixed(0).padStart(3, "0"), cx, 70);
    ctx.font = "22px Arial";
    ctx.fillStyle = "#9ad4ff";
    ctx.fillText(`TRK ${wrap360(fm.headingTrue).toFixed(0)}   GS ${fm.gsKt.toFixed(0)}`, cx, 110);
    ctx.fillText(`TAS ${fm.tasKt.toFixed(0)}   WIND ${fm.weather.windDirTrue.toFixed(0)}/${fm.weather.windKt.toFixed(0)}`, cx, 980);
  }

  private drawEicas(fm: FlightModel) {
    const ctx = this.eicasCtx;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "#cfd8e0";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText("ENGINE", 60, 60);

    gauge(ctx, 220, 260, fm.n1[0], 110, "N1", "%");
    gauge(ctx, 520, 260, fm.n1[1], 110, "N1", "%");
    gauge(ctx, 220, 520, fm.egt[0] / 10, 110, "EGT", "C", true);
    gauge(ctx, 520, 520, fm.egt[1] / 10, 110, "EGT", "C", true);

    ctx.fillStyle = "#9ad4ff";
    ctx.font = "24px Arial";
    ctx.fillText(`FF ${fm.fuelFlowPph[0].toFixed(0)} / ${fm.fuelFlowPph[1].toFixed(0)} PPH`, 80, 720);
    ctx.fillText(`FUEL ${fm.fuelKg.toFixed(0)} KG`, 80, 760);
    ctx.fillStyle = fm.gearActual > 0.9 ? "#48e070" : fm.gearActual < 0.1 ? "#cfd8e0" : "#ffe14a";
    ctx.fillText(`GEAR ${fm.controls.gearDown ? "DOWN" : "UP"}`, 80, 810);
    ctx.fillStyle = "#cfd8e0";
    ctx.fillText(`FLAPS ${fm.flapsActual.toFixed(0)}`, 80, 850);
    ctx.fillText(`N2 ${fm.n2[0].toFixed(1)}  ${fm.n2[1].toFixed(1)}`, 80, 890);
    ctx.fillText(`OAT ${(fm.weather.temperatureC).toFixed(0)} C    QNH ${(fm.weather.qnhPa / 100).toFixed(0)}`, 80, 940);
    if (fm.stallWarning) {
      ctx.fillStyle = "#ff3b3b";
      ctx.font = "bold 40px Arial";
      ctx.fillText("STALL WARN", 620, 810);
    }
  }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  step: number,
  label: string,
  left: boolean,
) {
  ctx.fillStyle = "rgba(8,10,14,0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffe14a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const cy = y + h / 2;
  const px = 3.1;
  ctx.fillStyle = "#f2f5f8";
  ctx.font = "22px Arial";
  ctx.textAlign = left ? "right" : "left";
  const start = Math.floor((value - 80) / step) * step;
  for (let v = start; v < value + 80; v += step) {
    const yy = cy - (v - value) * px;
    const tx = left ? x + w - 12 : x + 12;
    ctx.fillText(String(Math.round(v)), tx, yy + 8);
    ctx.fillRect(left ? x : x + w - 12, yy, 12, 2);
  }
  ctx.restore();
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(x - 4, cy - 26, w + 8, 52);
  ctx.strokeStyle = "#ffe14a";
  ctx.strokeRect(x - 4, cy - 26, w + 8, 52);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(value.toFixed(0), x + w / 2, cy + 10);
  ctx.fillStyle = "#9ad4ff";
  ctx.font = "16px Arial";
  ctx.fillText(label, x + w / 2, y - 8);
}

function gauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  max: number,
  label: string,
  unit: string,
  raw = false,
) {
  ctx.strokeStyle = "#4a5560";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(x, y, 90, Math.PI * 0.75, Math.PI * 0.25 + Math.PI * 2);
  ctx.stroke();
  const t = clamp(value / max, 0, 1);
  ctx.strokeStyle = t > 0.9 ? "#ff5a5a" : "#48e070";
  ctx.beginPath();
  const a0 = Math.PI * 0.75;
  const a1 = a0 + t * Math.PI * 1.5;
  ctx.arc(x, y, 90, a0, a1);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(raw ? (value * 10).toFixed(0) : value.toFixed(1), x, y + 8);
  ctx.font = "20px Arial";
  ctx.fillStyle = "#9ad4ff";
  ctx.fillText(label, x, y + 120);
  ctx.fillText(unit, x, y + 42);
}

function ll(lat: number, lon: number) {
  const ORIGIN_LAT = 40.6399281;
  const ORIGIN_LON = -73.7786922;
  const R = 6371000;
  const lat0 = (ORIGIN_LAT * Math.PI) / 180;
  const x = ((lon * Math.PI) / 180 - (ORIGIN_LON * Math.PI) / 180) * Math.cos(lat0) * R;
  const z = -((lat * Math.PI) / 180 - lat0) * R;
  return { x, z };
}

void MAG_VAR_WEST;
