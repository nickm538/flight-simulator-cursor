export type Quality = "auto" | "high" | "medium" | "low";

export interface InputState {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  tiller: number;
  lookX: number;
  lookY: number;
  brake: boolean;
  pause: boolean;
  viewCycle: boolean;
  flapsUp: boolean;
  flapsDown: boolean;
  gear: boolean;
  reverse: boolean;
  ap: boolean;
  atc: boolean;
  cameraReset: boolean;
  chaseScroll: number;
}

export class InputController {
  state: InputState = empty();
  keys = new Set<string>();
  pointerLocked = false;
  isTouch = matchMedia("(pointer: coarse)").matches;
  private _view = false;
  private _flapsU = false;
  private _flapsD = false;
  private _gear = false;
  private _rev = false;
  private _ap = false;
  private _atc = false;

  attach(el: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    el.addEventListener("mousedown", () => {
      if (!this.isTouch) el.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === el;
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.pointerLocked) return;
      this.state.lookX -= e.movementX * 0.0022;
      this.state.lookY = clampLook(this.state.lookY - e.movementY * 0.0022);
    });
    window.addEventListener("wheel", (e) => {
      this.state.chaseScroll += Math.sign(e.deltaY);
    });
    window.addEventListener("gamepadconnected", () => undefined);
    this.attachTouch();
  }

  sampleGamepad() {
    const gp = navigator.getGamepads?.()[0];
    if (!gp) return;
    this.state.roll = gp.axes[0] ?? 0;
    this.state.pitch = gp.axes[1] ?? 0;
    this.state.yaw = gp.axes[2] ?? 0;
    this.state.throttle = ((gp.axes[3] ?? -1) + 1) / 2;
    if (gp.buttons[0]?.pressed) this.state.brake = true;
  }

  consume(): InputState {
    this.sampleGamepad();
    const s = { ...this.state };
    s.viewCycle = this._view;
    s.flapsUp = this._flapsU;
    s.flapsDown = this._flapsD;
    s.gear = this._gear;
    s.reverse = this._rev;
    s.ap = this._ap;
    s.atc = this._atc;
    this._view = this._flapsU = this._flapsD = this._gear = this._rev = this._ap = this._atc = false;
    this.state.chaseScroll = 0;

    const k = this.keys;
    if (!s.roll && (k.has("a") || k.has("arrowleft"))) s.roll = -1;
    if (!s.roll && (k.has("d") || k.has("arrowright"))) s.roll = 1;
    if (!s.pitch && (k.has("w") || k.has("arrowdown"))) s.pitch = 1;
    if (!s.pitch && (k.has("s") || k.has("arrowup"))) s.pitch = -1;
    if (k.has("q")) s.yaw = -1;
    if (k.has("e")) s.yaw = 1;
    if (k.has("z") || k.has("pageup")) s.throttle = Math.min(1, (this.state.throttle = Math.min(1, this.state.throttle + 0.02)));
    if (k.has("x") || k.has("pagedown")) s.throttle = Math.max(0, (this.state.throttle = Math.max(0, this.state.throttle - 0.02)));
    if (k.has("shift")) s.throttle = Math.min(1, this.state.throttle + 0.015);
    if (k.has("control")) s.throttle = Math.max(0, this.state.throttle - 0.015);
    s.brake = s.brake || k.has("b") || k.has(".");
    if (k.has("arrowleft") && k.has("shift")) s.tiller = -1;
    if (k.has("arrowright") && k.has("shift")) s.tiller = 1;
    this.state.pitch = s.pitch;
    this.state.roll = s.roll;
    this.state.yaw = s.yaw;
    return s;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === "v") this._view = true;
    if (k === "]" || k === "f") this._flapsD = true;
    if (k === "[" || k === "r") this._flapsU = true;
    if (k === "g") this._gear = true;
    if (k === "i") this._rev = true;
    if (k === "a" && e.altKey) this._ap = true;
    if (k === "p" && e.altKey) this._ap = true;
    if (k === "enter" || k === " ") this._atc = true;
    if (k === "c") this.state.cameraReset = true;
    if (k === "1") this.state.throttle = 0.21;
    if (k === "2") this.state.throttle = 0.4;
    if (k === "3") this.state.throttle = 0.7;
    if (k === "4") this.state.throttle = 1;
    if (k === "escape") this.state.pause = !this.state.pause;
    if (["arrowup", "arrowdown", " ", "w", "s"].includes(k)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
    if (e.key.toLowerCase() === "c") this.state.cameraReset = false;
  };

  private attachTouch() {
    const root = document.getElementById("touch-layer");
    if (!root) return;
    const stick = document.getElementById("stick") as HTMLElement | null;
    const thumb = document.getElementById("stick-thumb") as HTMLElement | null;
    const thr = document.getElementById("thr-slider") as HTMLInputElement | null;
    if (thr) {
      thr.addEventListener("input", () => {
        this.state.throttle = Number(thr.value);
      });
    }
    if (!stick || !thumb) return;
    const start = { x: 0, y: 0, active: false };
    const apply = (cx: number, cy: number) => {
      const rect = stick.getBoundingClientRect();
      const dx = (cx - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (cy - (rect.top + rect.height / 2)) / (rect.height / 2);
      this.state.roll = Math.max(-1, Math.min(1, dx));
      this.state.pitch = Math.max(-1, Math.min(1, dy));
      thumb.style.transform = `translate(${this.state.roll * 36}px, ${this.state.pitch * 36}px)`;
    };
    stick.addEventListener("pointerdown", (e) => {
      start.active = true;
      stick.setPointerCapture(e.pointerId);
      apply(e.clientX, e.clientY);
    });
    stick.addEventListener("pointermove", (e) => {
      if (start.active) apply(e.clientX, e.clientY);
    });
    const end = () => {
      start.active = false;
      this.state.roll = 0;
      this.state.pitch = 0;
      thumb.style.transform = "translate(0,0)";
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
  }
}

function empty(): InputState {
  return {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.24,
    tiller: 0,
    lookX: 0,
    lookY: 0,
    brake: false,
    pause: false,
    viewCycle: false,
    flapsUp: false,
    flapsDown: false,
    gear: false,
    reverse: false,
    ap: false,
    atc: false,
    cameraReset: false,
    chaseScroll: 0,
  };
}

function clampLook(v: number) {
  return Math.max(-1.1, Math.min(1.1, v));
}
