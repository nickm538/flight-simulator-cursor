import { describe, expect, it } from "vitest";
import { latLonToWorld, worldToLatLon, dmmToDeg } from "../client/src/util/geo";
import { isa } from "../client/src/util/atmosphere";
import { wrap360, ktToMs, msToKt } from "../client/src/util/math";
import { AIRPORTS } from "../client/src/aircraft/constants";
import { FlightModel } from "../client/src/aircraft/flightModel";
import { AtcEngine } from "../client/src/atc/engine";

describe("geo", () => {
  it("keeps KJFK at the world origin", () => {
    const p = latLonToWorld(40.6399281, -73.7786922);
    expect(Math.abs(p.x)).toBeLessThan(1);
    expect(Math.abs(p.z)).toBeLessThan(1);
  });

  it("round-trips lat/lon", () => {
    const { lat, lon } = worldToLatLon(1000, -500);
    const back = latLonToWorld(lat, lon);
    expect(Math.abs(back.x - 1000)).toBeLessThan(0.5);
    expect(Math.abs(back.z + 500)).toBeLessThan(0.5);
  });

  it("parses DMM runway coordinates", () => {
    expect(dmmToDeg(40, 37.679665)).toBeCloseTo(40.627994, 5);
  });

  it("places EWR west of JFK", () => {
    const ewr = latLonToWorld(AIRPORTS[2].lat, AIRPORTS[2].lon);
    expect(ewr.x).toBeLessThan(-20000);
  });
});

describe("atmosphere", () => {
  it("matches ISA tropopause temperature", () => {
    const trop = isa(11000);
    expect(trop.temperature).toBeCloseTo(216.65, 0);
  });

  it("density falls with altitude", () => {
    expect(isa(11000).density).toBeLessThan(isa(0).density);
  });
});

describe("math", () => {
  it("wraps headings", () => {
    expect(wrap360(370)).toBe(10);
    expect(wrap360(-10)).toBe(350);
  });
  it("converts knots", () => {
    expect(msToKt(ktToMs(100))).toBeCloseTo(100, 4);
  });
});

describe("737 flight model", () => {
  it("faces the assigned runway heading", () => {
    const fm = new FlightModel();
    fm.elevationFn = () => 4;
    fm.placeOnRunway(0, 4, 0, 301);
    expect(fm.headingTrue).toBeCloseTo(301, 0);
  });

  it("sits still on the parking brake", () => {
    const fm = new FlightModel();
    fm.elevationFn = () => 4;
    fm.placeOnRunway(0, 4, 0, 301);
    fm.controls.parkingBrake = true;
    fm.controls.throttle = 0.05;
    fm.controls.throttleL = 0.05;
    fm.controls.throttleR = 0.05;
    for (let i = 0; i < 120; i++) fm.step(1 / 60);
    expect(fm.gsKt).toBeLessThan(3);
    expect(fm.crashed).toBe(false);
  });

  it("accelerates on a takeoff roll", () => {
    const fm = new FlightModel();
    fm.elevationFn = () => 4;
    fm.placeOnRunway(0, 4, 0, 301);
    fm.controls.parkingBrake = false;
    fm.controls.brake = 0;
    fm.controls.throttle = 1;
    fm.controls.throttleL = 1;
    fm.controls.throttleR = 1;
    fm.n1 = [90, 90];
    for (let i = 0; i < 20 * 60; i++) fm.step(1 / 60);
    expect(fm.iasKt).toBeGreaterThan(80);
  });

  it("reports sane V speeds", () => {
    const fm = new FlightModel();
    const v = fm.vSpeeds();
    expect(v.vr).toBeGreaterThan(110);
    expect(v.vr).toBeLessThan(180);
    expect(v.vref).toBeGreaterThan(110);
  });
});

describe("ATC", () => {
  it("issues an IFR clearance and takeoff", () => {
    const fm = new FlightModel();
    const atc = new AtcEngine("Southwest 1847", AIRPORTS[0]);
    atc.transmit("clr", fm);
    expect(atc.clearance).toBe(true);
    atc.transmit("push", fm);
    atc.transmit("taxi", fm);
    atc.transmit("ready", fm);
    expect(atc.takeoff).toBe(true);
    expect(atc.log.some((m) => m.text.toLowerCase().includes("cleared for takeoff"))).toBe(true);
  });
});
