import * as THREE from "three";
import { B738, FLAP_DETENTS, type FlapDetent, MAG_VAR_WEST } from "./constants";
import { clamp, damp, deg, ktToMs, msToKt, mToFt, mpsToFpm, rad, wrap360, wrapPi } from "../util/math";
import { isa, tasToIas, RHO0, G } from "../util/atmosphere";

export interface WeatherState {
  windDirTrue: number;
  windKt: number;
  gustKt: number;
  visibilityM: number;
  cloudBaseM: number;
  cloudCover: number;
  qnhPa: number;
  dIsa: number;
  precip: number;
  temperatureC: number;
}

export const DEFAULT_WEATHER: WeatherState = {
  windDirTrue: 130,
  windKt: 10,
  gustKt: 14,
  visibilityM: 16000,
  cloudBaseM: 1100,
  cloudCover: 0.25,
  qnhPa: 102460,
  dIsa: 4,
  precip: 0,
  temperatureC: 21,
};

export interface Controls {
  throttle: number;
  throttleL: number;
  throttleR: number;
  elevator: number;
  aileron: number;
  rudder: number;
  tiller: number;
  flapsDetent: FlapDetent;
  spoiler: number;
  gearDown: boolean;
  brake: number;
  parkingBrake: boolean;
  reverse: boolean;
  trim: number;
  autoSpoilers: boolean;
}

export type ViewMode =
  | "cockpit"
  | "chase"
  | "wing"
  | "gear"
  | "engine"
  | "tower"
  | "external"
  | "flyby";

const FLAP_CL: Record<number, number> = {
  0: 0,
  1: 0.18,
  5: 0.38,
  10: 0.52,
  15: 0.68,
  25: 0.92,
  30: 1.08,
  40: 1.22,
};
const FLAP_CD: Record<number, number> = {
  0: 0,
  1: 0.008,
  5: 0.018,
  10: 0.028,
  15: 0.04,
  25: 0.065,
  30: 0.09,
  40: 0.12,
};

export class FlightModel {
  mass = B738.typicalMass;
  fuelKg = 8200;
  position = new THREE.Vector3();
  quaternion = new THREE.Quaternion();
  velocity = new THREE.Vector3();
  omega = new THREE.Vector3();
  accel = new THREE.Vector3();

  controls: Controls = {
    throttle: 0.24,
    throttleL: 0.24,
    throttleR: 0.24,
    elevator: 0,
    aileron: 0,
    rudder: 0,
    tiller: 0,
    flapsDetent: 5,
    spoiler: 0,
    gearDown: true,
    brake: 0,
    parkingBrake: true,
    reverse: false,
    trim: 0.12,
    autoSpoilers: true,
  };

  flapsActual = 5;
  gearActual = 1;
  n1 = [22, 22];
  n2 = [60, 60];
  egt = [480, 480];
  n1Target = [22, 22];
  fuelFlowPph = [600, 600];

  onGround = true;
  gearForce = [0, 0, 0];
  stallWarning = false;
  stickShaker = false;
  crashed = false;
  crashReason = "";
  wow = [true, true, true];
  wheelOmega = [0, 0, 0, 0, 0, 0];
  tireSmoke = 0;
  engineDust = 0;
  reverseUnlock = false;

  lights = {
    landing: true,
    taxi: true,
    nav: true,
    strobe: true,
    beacon: true,
    logo: true,
  };

  ap = {
    master: false,
    at: false,
    hdgSel: false,
    altHld: false,
    vs: false,
    loc: false,
    app: false,
    speedKt: 150,
    heading: 301,
    altitudeFt: 5000,
    vsFpm: 0,
  };

  weather: WeatherState = { ...DEFAULT_WEATHER };
  elevationFn: (x: number, z: number) => number = () => 4;
  magVar = MAG_VAR_WEST;

  alpha = 0;
  beta = 0;
  loadFactor = 1;
  mach = 0;
  tas = 0;
  ias = 0;
  gs = 0;
  radioAlt = 0;
  lastVs = 0;
  touchdownFpm = 0;
  engVibration = 0;

  private _fwd = new THREE.Vector3();
  private _up = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _velBody = new THREE.Vector3();
  private _qTmp = new THREE.Quaternion();
  private _euler = new THREE.Euler();
  private _force = new THREE.Vector3();
  private _torque = new THREE.Vector3();
  private _wind = new THREE.Vector3();
  private _vRel = new THREE.Vector3();
  private _liftDir = new THREE.Vector3();
  private _dragDir = new THREE.Vector3();
  private _sideDir = new THREE.Vector3();
  private _tmp = new THREE.Vector3();
  private _tmp2 = new THREE.Vector3();
  private _gearTau = new THREE.Vector3();
  private _omegaQ = new THREE.Quaternion();

  get pitch(): number {
    this._euler.setFromQuaternion(this.quaternion, "YXZ");
    return this._euler.x;
  }
  get bank(): number {
    this._euler.setFromQuaternion(this.quaternion, "YXZ");
    return this._euler.z;
  }
  get headingTrue(): number {
    this.forward(this._fwd);
    return wrap360(deg(Math.atan2(this._fwd.x, -this._fwd.z)));
  }
  get headingMag(): number {
    return wrap360(this.headingTrue + this.magVar);
  }
  get altitudeMSL(): number {
    return this.position.y;
  }
  get altitudeFt(): number {
    return mToFt(this.position.y);
  }
  get vsFpm(): number {
    return mpsToFpm(this.velocity.y);
  }
  get iasKt(): number {
    return msToKt(this.ias);
  }
  get tasKt(): number {
    return msToKt(this.tas);
  }
  get gsKt(): number {
    return msToKt(this.gs);
  }
  get aglM(): number {
    return this.radioAlt;
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0, 1).applyQuaternion(this.quaternion);
  }
  up(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 1, 0).applyQuaternion(this.quaternion);
  }
  right(out: THREE.Vector3): THREE.Vector3 {
    return out.set(1, 0, 0).applyQuaternion(this.quaternion);
  }

  reset() {
    this.velocity.set(0, 0, 0);
    this.omega.set(0, 0, 0);
    this.crashed = false;
    this.crashReason = "";
    this.n1 = [22, 22];
    this.n2 = [60, 60];
    this.gearActual = this.controls.gearDown ? 1 : 0;
    this.flapsActual = this.controls.flapsDetent;
    this.tireSmoke = 0;
  }

  placeOnRunway(x: number, y: number, z: number, headingTrueDeg: number, rolling = false) {
    this.quaternion.setFromEuler(new THREE.Euler(0, rad(180 - headingTrueDeg), 0, "YXZ"));
    this.forward(this._fwd);
    const alt = y + B738.gearRestLength + B738.wheelRadius - 0.08;
    this.position.set(x, alt, z);
    this.reset();
    this.onGround = true;
    if (rolling) {
      const v = ktToMs(30);
      this.velocity.copy(this._fwd).multiplyScalar(v);
      this.controls.parkingBrake = false;
      this.controls.throttle = 0.4;
    }
  }

  placeInAir(x: number, y: number, z: number, headingTrueDeg: number, iasKt: number) {
    this.quaternion.setFromEuler(new THREE.Euler(rad(2.5), rad(180 - headingTrueDeg), 0, "YXZ"));
    this.forward(this._fwd);
    this.position.set(x, y, z);
    this.reset();
    this.onGround = false;
    this.controls.gearDown = y < 80 ? true : false;
    this.gearActual = this.controls.gearDown ? 1 : 0;
    this.controls.parkingBrake = false;
    const atm = isa(y, this.weather.dIsa, this.weather.qnhPa);
    const tas = ktToMs(iasKt) / Math.sqrt(atm.density / RHO0);
    this.velocity.copy(this._fwd).multiplyScalar(tas);
    this.controls.throttle = 0.62;
    this.n1 = [72, 72];
  }

  nextFlaps(dir: 1 | -1) {
    const i = FLAP_DETENTS.indexOf(this.controls.flapsDetent);
    const n = clamp(i + dir, 0, FLAP_DETENTS.length - 1);
    this.controls.flapsDetent = FLAP_DETENTS[n];
  }

  step(dt: number) {
    if (this.crashed) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.substep(h);
  }

  private substep(dt: number) {
    this.mass = B738.emptyMass + this.fuelKg + 14000;
    this.updateEngines(dt);
    this.flapsActual = damp(this.flapsActual, this.controls.flapsDetent, 1.1, dt);
    this.gearActual = damp(this.gearActual, this.controls.gearDown ? 1 : 0, 1.4, dt);
    this.autopilot(dt);

    this.forward(this._fwd);
    this.up(this._up);
    this.right(this._right);

    const elev = this.elevationFn(this.position.x, this.position.z);
    this.radioAlt = this.position.y - elev - (B738.gearRestLength + B738.wheelRadius) * this.gearActual;

    const atm = isa(this.position.y, this.weather.dIsa, this.weather.qnhPa);
    this.windVector(this._wind);
    this._vRel.copy(this.velocity).sub(this._wind);
    this.tas = this._vRel.length();
    this.gs = Math.hypot(this.velocity.x, this.velocity.z);
    this.ias = tasToIas(this.tas, atm.density);
    this.mach = this.tas / atm.speedOfSound;

    this._velBody.copy(this._vRel).applyQuaternion(this._qTmp.copy(this.quaternion).invert());
    const u = this._velBody.z;
    const v = this._velBody.x;
    const w = this._velBody.y;
    this.alpha = Math.atan2(-w, Math.max(0.1, u));
    this.beta = Math.atan2(v, Math.max(0.1, u));

    const q = 0.5 * atm.density * this.tas * this.tas;
    const S = B738.wingArea;
    const c = B738.wingChord;
    const b = B738.wingspan;

    const flapCl = this.interpMap(FLAP_CL, this.flapsActual);
    const flapCd = this.interpMap(FLAP_CD, this.flapsActual);
    const slat = this.flapsActual >= 1 ? 0.12 : 0;
    const clAlpha = 5.15;
    const cl0 = 0.18 + flapCl + slat;
    const alphaStall = rad(16 + this.flapsActual * 0.12);
    const alphaLin = clamp(this.alpha, -alphaStall, alphaStall);
    let cl = cl0 + clAlpha * alphaLin;
    const stallBlend = smoothstall(this.alpha, alphaStall);
    cl *= 1 - 0.72 * stallBlend;
    this.stallWarning = Math.abs(this.alpha) > alphaStall * 0.82 && this.ias > ktToMs(50);
    this.stickShaker = Math.abs(this.alpha) > alphaStall * 0.92 && this.ias > ktToMs(60);

    const ge = groundEffect(this.radioAlt, b);
    cl *= 1 + 0.35 * ge;

    const cd0 = 0.021 + flapCd + this.gearActual * 0.018 + this.controls.spoiler * 0.07 + (this.controls.reverse ? 0.02 : 0);
    const k = 1 / (Math.PI * (b * b / S) * 0.8);
    let cd = cd0 + k * cl * cl * (1 - 0.45 * ge);
    cd *= 1 + 0.8 * stallBlend;
    const cy = -0.85 * this.beta - 0.18 * this.controls.rudder;

    if (this.tas > 0.5) {
      this._dragDir.copy(this._vRel).multiplyScalar(-1 / this.tas);
      this._liftDir.copy(this._dragDir).cross(this._right).normalize();
      if (this._liftDir.dot(this._up) < 0) this._liftDir.multiplyScalar(-1);
      this._sideDir.copy(this._right);
    } else {
      this._dragDir.set(0, 0, 0);
      this._liftDir.copy(this._up);
      this._sideDir.copy(this._right);
    }

    const lift = q * S * cl;
    const drag = q * S * cd;
    const side = q * S * cy;

    this._force.set(0, -this.mass * G, 0);
    this._tmp.copy(this._liftDir).multiplyScalar(lift);
    this._force.add(this._tmp);
    this._tmp.copy(this._dragDir).multiplyScalar(drag);
    this._force.add(this._tmp);
    this._tmp.copy(this._sideDir).multiplyScalar(side);
    this._force.add(this._tmp);

    const thrust = this.engineThrust(atm);
    this._tmp.copy(this._fwd).multiplyScalar(thrust);
    this._force.add(this._tmp);

    this.applyGear(dt, elev);

    this.accel.copy(this._force).multiplyScalar(1 / this.mass);
    this.velocity.addScaledVector(this.accel, dt);
    this.position.addScaledVector(this.velocity, dt);

    this.loadFactor = lift / Math.max(1, this.mass * G);

    const p = this.omega.x;
    const r = this.omega.y;
    const pitchRate = this.omega.z;

    const cm0 = -0.025;
    const cma = -1.05;
    const cmq = -12.5;
    const cmde = -1.35;
    const cmTrim = -1.1;
    const clb = -0.12;
    const clp = -0.45;
    const clda = 0.18;
    const cldr = 0.02;
    const cnb = 0.12;
    const cnr = -0.16;
    const cndr = -0.1;
    const cnda = -0.01;

    const elevator = clamp(this.controls.elevator + this.controls.trim, -1, 1);
    const aileron = this.controls.aileron;
    const rudder = this.controls.rudder;

    const dyn = q * S;
    const Cm = cm0 + cma * this.alpha + cmq * pitchRate * c / Math.max(1, 2 * this.tas) + cmde * elevator + cmTrim * this.controls.trim;
    const Cl = clb * this.beta + clp * p * b / Math.max(1, 2 * this.tas) + clda * aileron + cldr * rudder;
    const Cn = cnb * this.beta + cnr * r * b / Math.max(1, 2 * this.tas) + cndr * rudder + cnda * aileron;
    const CnDamp = this.onGround ? 0 : -0.08 * this.beta;

    this._torque.set(
      Cl * dyn * b,
      (Cn + CnDamp) * dyn * b,
      Cm * dyn * c,
    );
    this._torque.add(this._gearTau);

    const engineAsym = (this.n1[0] - this.n1[1]) * 80;
    this._torque.y += engineAsym;

    if (this.onGround) {
      this._torque.x *= 0.15;
      this.omega.x *= Math.exp(-12 * dt);
      this.omega.y *= Math.exp(-7 * dt);
      this.omega.z *= Math.exp(-4 * dt);
    }

    const Ixx = B738.Ixx;
    const Iyy = B738.Iyy;
    const Izz = B738.Izz;
    const wp = this._torque.x / Ixx;
    const wr = this._torque.y / Iyy;
    const wq = this._torque.z / Izz;
    this.omega.x += wp * dt;
    this.omega.y += wr * dt;
    this.omega.z += wq * dt;
    this.omega.multiplyScalar(1 - 0.15 * dt);

    this._omegaQ.set(this.omega.x * dt * 0.5, this.omega.y * dt * 0.5, this.omega.z * dt * 0.5, 0);
    this._qTmp.copy(this.quaternion).multiply(this._omegaQ);
    this.quaternion.x += this._qTmp.x;
    this.quaternion.y += this._qTmp.y;
    this.quaternion.z += this._qTmp.z;
    this.quaternion.w += this._qTmp.w;
    this.quaternion.normalize();

    const burn = ((this.n1[0] + this.n1[1]) / 200) * 0.42 * dt;
    this.fuelKg = Math.max(200, this.fuelKg - burn);
    this.fuelFlowPph = [
      400 + Math.pow(this.n1[0] / 100, 2.2) * 3200,
      400 + Math.pow(this.n1[1] / 100, 2.2) * 3200,
    ];

    if (this.position.y < elev - 2 && this.gs > ktToMs(40)) {
      this.crash("Terrain impact");
    }
    if (Math.abs(this.bank) > rad(90) && this.radioAlt < 8 && this.gs > ktToMs(30) && !this.onGround) {
      this.crash("Wing strike");
    }

    this.tireSmoke = damp(this.tireSmoke, 0, 1.8, dt);
    this.engineDust =
      this.onGround && this.n1[0] > 40 && this.gs < ktToMs(40)
        ? damp(this.engineDust, (this.n1[0] - 40) / 60, 2, dt)
        : damp(this.engineDust, 0, 3, dt);

    this.lastVs = this.velocity.y;
  }

  private engineThrust(atm: { density: number; temperature: number; sigma: number }): number {
    const tMax = B738.maxThrustN * 0.5;
    const machFac = 1 - 0.35 * clamp(this.mach, 0, 0.9);
    let total = 0;
    for (let i = 0; i < 2; i++) {
      const n = this.n1[i] / 100;
      let t = tMax * Math.pow(Math.max(0.05, n), 3.4) * atm.sigma * machFac;
      if (this.controls.reverse && this.reverseUnlock) t *= -0.42;
      total += t;
    }
    return total;
  }

  private updateEngines(dt: number) {
    const idle = this.onGround ? 21 : 24;
    const tL = this.controls.reverse ? idle : this.controls.throttleL;
    const tR = this.controls.reverse ? idle : this.controls.throttleR;
    this.n1Target[0] = idle + tL * (104 - idle);
    this.n1Target[1] = idle + tR * (104 - idle);
    const spool = this.n1[0] < this.n1Target[0] ? 0.55 : 0.85;
    this.n1[0] = damp(this.n1[0], this.n1Target[0], spool, dt);
    this.n1[1] = damp(this.n1[1], this.n1Target[1], spool, dt);
    this.n2[0] = 58 + this.n1[0] * 0.4;
    this.n2[1] = 58 + this.n1[1] * 0.4;
    this.egt[0] = 420 + this.n1[0] * 6.2;
    this.egt[1] = 420 + this.n1[1] * 6.2;
    if (this.onGround && this.gs < ktToMs(2)) this.reverseUnlock = false;
    if (!this.onGround && this.radioAlt > 3) this.reverseUnlock = true;
    this.engVibration = (this.n1[0] + this.n1[1]) / 200 * 0.002;
  }

  private applyGear(dt: number, elev: number) {
    const k = 220000;
    const c = 42000;
    const rest = B738.gearRestLength;
    const wr = B738.wheelRadius;
    const points = [
      { x: 0, z: B738.noseGearZ, nose: true, i: 0 },
      { x: -B738.mainGearX, z: B738.mainGearZ, nose: false, i: 1 },
      { x: B738.mainGearX, z: B738.mainGearZ, nose: false, i: 2 },
    ];
    let contacts = 0;
    this.gearForce = [0, 0, 0];
    this._gearTau.set(0, 0, 0);

    for (const g of points) {
      this._tmp.set(g.x, -rest, g.z).applyQuaternion(this.quaternion);
      this._tmp2.copy(this._tmp);
      this._tmp.add(this.position);
      const gy = this.elevationFn(this._tmp.x, this._tmp.z);
      const compression = gy + wr - this._tmp.y;
      const wow = compression > -0.04 && this.gearActual > 0.7;
      this.wow[g.i] = wow;
      if (!wow || this.gearActual < 0.5) continue;
      contacts++;
      const comp = Math.max(0, compression);
      const vDown = this.velocity.y;
      const spring = k * comp - c * vDown;
      const fy = Math.max(0, spring);
      this.gearForce[g.i] = fy;
      this._force.y += fy;

      this._tmp.set(0, fy, 0);
      this._tmp2.cross(this._tmp);
      this._tmp2.applyQuaternion(this._qTmp.copy(this.quaternion).invert());
      this._gearTau.add(this._tmp2);

      const frictionMu = 0.022 + this.controls.brake * 0.5 + (this.controls.parkingBrake ? 1.6 : 0);
      const fwdSpeed = this.velocity.dot(this._fwd);
      const sideSpeed = this.velocity.dot(this._right);
      this._force.addScaledVector(this._fwd, -Math.sign(fwdSpeed || 0) * fy * frictionMu);
      const sideMu = g.nose ? 0.4 : 0.85;
      this._force.addScaledVector(this._right, -sideSpeed * fy * sideMu * 0.05);

      if (g.nose && this.gs < ktToMs(45)) {
        const steer = clamp(this.controls.tiller + this.controls.rudder * 0.25, -1, 1);
        this._force.addScaledVector(this._right, steer * fy * 0.28);
        this._gearTau.y += steer * 22000;
      }

      const wheelR = g.nose ? B738.noseWheelRadius : B738.wheelRadius;
      const idx = g.nose ? 0 : g.i + 2;
      this.wheelOmega[idx] = fwdSpeed / Math.max(0.2, wheelR);
    }

    this.onGround = contacts >= 1;
    if (this.onGround && this.lastVs < -1.8 && this.radioAlt < 4) {
      this.tireSmoke = Math.min(1, (-this.lastVs - 1.8) / 4);
      this.touchdownFpm = mpsToFpm(this.lastVs);
    }
    if (this.onGround) {
      this.velocity.y = Math.max(this.velocity.y, -0.5);
      if (this.position.y < elev + rest + wr - 0.4) {
        this.position.y = elev + rest + wr - 0.05;
      }
    }
    void dt;
  }

  private windVector(out: THREE.Vector3) {
    const dir = rad(this.weather.windDirTrue);
    const kt = this.weather.windKt + Math.sin(performance.now() * 0.0015) * (this.weather.gustKt - this.weather.windKt) * 0.5;
    const ms = ktToMs(kt);
    const fromX = Math.sin(dir);
    const fromZ = -Math.cos(dir);
    out.set(-fromX * ms, 0, -fromZ * ms);
  }

  private interpMap(map: Record<number, number>, flaps: number): number {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (flaps <= keys[0]) return map[keys[0]];
    if (flaps >= keys[keys.length - 1]) return map[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
      if (flaps >= keys[i] && flaps <= keys[i + 1]) {
        const t = (flaps - keys[i]) / (keys[i + 1] - keys[i]);
        return map[keys[i]] + t * (map[keys[i + 1]] - map[keys[i]]);
      }
    }
    return 0;
  }

  private autopilot(dt: number) {
    if (!this.ap.master) return;
    const hdgErr = wrapPi(rad(this.ap.heading - this.headingMag));
    if (this.ap.hdgSel) {
      const bankT = clamp(hdgErr * 1.6, rad(-25), rad(25));
      const bankErr = bankT - this.bank;
      this.controls.aileron = damp(this.controls.aileron, clamp(bankErr * 1.4, -1, 1), 4, dt);
    }
    if (this.ap.altHld) {
      const altErr = this.ap.altitudeFt - this.altitudeFt;
      const vsT = clamp(altErr * 8, -2200, 2200);
      const vsErr = (this.ap.vs ? this.ap.vsFpm : vsT) - this.vsFpm;
      this.controls.elevator = damp(this.controls.elevator, clamp(-vsErr / 2500, -0.5, 0.5), 2.2, dt);
    }
    if (this.ap.at) {
      const spdErr = this.ap.speedKt - this.iasKt;
      const t = clamp(this.controls.throttle + spdErr * 0.008, 0.05, 1);
      this.controls.throttle = damp(this.controls.throttle, t, 0.8, dt);
      this.controls.throttleL = this.controls.throttle;
      this.controls.throttleR = this.controls.throttle;
    }
  }

  crash(reason: string) {
    this.crashed = true;
    this.crashReason = reason;
    this.velocity.multiplyScalar(0.1);
    this.n1 = [0, 0];
  }

  vSpeeds() {
    const w = this.mass * G;
    const vs = Math.sqrt((2 * w) / (RHO0 * B738.wingArea * (1.55 + this.interpMap(FLAP_CL, this.flapsActual))));
    const vsKt = msToKt(vs);
    const vref = vsKt * 1.3;
    return {
      vs: vsKt,
      vr: vsKt * 1.15 + 8,
      v2: vsKt * 1.22 + 12,
      vref,
    };
  }
}

function groundEffect(radioAlt: number, span: number): number {
  const h = Math.max(0.05, radioAlt) / span;
  return clamp(1 / (1 + 32 * h * h) - 0.05, 0, 1);
}

function smoothstall(alpha: number, aStall: number): number {
  const x = (Math.abs(alpha) - aStall) / rad(8);
  return clamp(x, 0, 1);
}
