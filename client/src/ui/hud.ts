import type { AtcChoice, AtcMessage } from "../atc/engine";
import type { FlightModel } from "../aircraft/flightModel";
import { SCENARIOS } from "../aircraft/constants";

export class Hud {
  root: HTMLElement;
  constructor() {
    this.root = document.getElementById("hud")!;
  }

  render(
    fm: FlightModel,
    atcLog: AtcMessage[],
    choices: AtcChoice[],
    view: string,
    paused: boolean,
    atcOpen: boolean,
  ) {
    const speeds = fm.vSpeeds();
    const pfdMini = document.getElementById("strip-left")!;
    pfdMini.innerHTML = `
      <div class="chip"><span>IAS</span><b>${fm.iasKt.toFixed(0)}</b> kt</div>
      <div class="chip"><span>ALT</span><b>${fm.altitudeFt.toFixed(0)}</b> ft</div>
      <div class="chip"><span>VS</span><b>${fm.vsFpm.toFixed(0)}</b></div>
      <div class="chip"><span>HDG</span><b>${fm.headingMag.toFixed(0).padStart(3, "0")}</b></div>
      <div class="chip"><span>N1</span><b>${fm.n1[0].toFixed(1)}</b>%</div>
      <div class="chip"><span>FLAP</span><b>${fm.flapsActual.toFixed(0)}</b></div>
      <div class="chip"><span>GEAR</span><b>${fm.controls.gearDown ? "DN" : "UP"}</b></div>
      <div class="chip"><span>V<sub>r</sub></span><b>${speeds.vr.toFixed(0)}</b></div>
    `;
    document.getElementById("view-name")!.textContent = view.toUpperCase();
    const log = document.getElementById("atc-log")!;
    log.innerHTML = atcLog
      .slice(-8)
      .map(
        (m) =>
          `<div class="msg ${m.from.toLowerCase()}"><i>${m.facility}</i> ${escapeHtml(m.text)}</div>`,
      )
      .join("");
    log.scrollTop = log.scrollHeight;
    const box = document.getElementById("atc-choices")!;
    box.innerHTML = choices
      .map((c) => `<button data-atc="${c.id}" class="atc-btn">${escapeHtml(c.label)}</button>`)
      .join("");
    document.getElementById("atc-panel")!.classList.toggle("open", atcOpen);
    document.getElementById("pause-veil")!.classList.toggle("show", paused);
    const warn = document.getElementById("warnings")!;
    warn.innerHTML = [
      fm.stallWarning ? `<span class="bad">STALL</span>` : "",
      fm.ap.master ? `<span class="ok">A/P CMD</span>` : "",
      fm.controls.parkingBrake ? `<span class="warn">PARK BRK</span>` : "",
      fm.onGround ? `<span>GND</span>` : "",
      fm.crashed ? `<span class="bad">${escapeHtml(fm.crashReason)}</span>` : "",
    ].join("");
  }
}

export function bindMenu(onStart: (id: string) => void) {
  const menu = document.getElementById("menu")!;
  const list = document.getElementById("scenario-list")!;
  list.innerHTML = SCENARIOS.map(
    (s) => `
      <button class="scenario" data-id="${s.id}">
        <strong>${s.title}</strong>
        <span>${s.blurb}</span>
      </button>`,
  ).join("");
  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-id]") as HTMLElement | null;
    if (!btn) return;
    menu.classList.add("hidden");
    onStart(btn.dataset.id!);
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
