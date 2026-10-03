import type { AirportDef } from "../aircraft/constants";
import type { FlightModel } from "../aircraft/flightModel";

export type AtcFacility = "ATIS" | "CLR" | "GND" | "TWR" | "DEP" | "APP" | "CTR";

export interface AtcMessage {
  from: "ATC" | "PILOT";
  facility: AtcFacility;
  text: string;
  ts: number;
}

export interface AtcChoice {
  id: string;
  label: string;
  say: string;
}

export class AtcEngine {
  callsign: string;
  airport: AirportDef;
  facility: AtcFacility = "CLR";
  squawk = "3471";
  clearedAltitude = 5000;
  clearedHeading = 301;
  dest = "KLGA";
  runway = "31L";
  taxiRoute = "Alpha, Bravo, hold short 31L";
  gate = "B22";
  log: AtcMessage[] = [];
  pushed = false;
  clearance = false;
  taxi = false;
  takeoff = false;
  airborne = false;
  landed = false;

  constructor(callsign: string, airport: AirportDef) {
    this.callsign = callsign;
    this.airport = airport;
    this.runway = airport.runways.find((r) => r.id.includes("31") || r.id.includes("22"))?.id ?? airport.runways[0].id;
    this.say(
      "ATC",
      "ATIS",
      `${airport.name} information Romeo. Wind 130 at 10, visibility 10, few clouds 3 thousand 5 hundred. Temperature 21, dewpoint 12, altimeter 3025. ILS ${this.runway} in use. Advise on initial contact you have Romeo.`,
    );
  }

  choices(fm: FlightModel): AtcChoice[] {
    const a = this.airport;
    const list: AtcChoice[] = [];
    if (!this.clearance) {
      list.push({
        id: "clr",
        label: "Request IFR clearance",
        say: `${a.name} Clearance, ${this.callsign} at gate ${this.gate}, IFR to ${this.dest}, information Romeo.`,
      });
    }
    if (this.clearance && !this.pushed) {
      list.push({
        id: "push",
        label: "Request pushback",
        say: `${a.name} Ground, ${this.callsign} gate ${this.gate}, request push and start.`,
      });
    }
    if (this.pushed && !this.taxi) {
      list.push({
        id: "taxi",
        label: "Request taxi",
        say: `${a.name} Ground, ${this.callsign}, ready to taxi, ${this.runway}.`,
      });
    }
    if (this.taxi && !this.takeoff && fm.onGround) {
      list.push({
        id: "ready",
        label: "Ready for departure",
        say: `${a.name} Tower, ${this.callsign} holding short ${this.runway}, ready for departure.`,
      });
    }
    if (!fm.onGround) {
      list.push({
        id: "higher",
        label: "Request higher",
        say: `${this.callsign} request flight level 240.`,
      });
      list.push({
        id: "vectors",
        label: "Request vectors for ILS",
        say: `${this.callsign} request vectors ILS ${this.runway}.`,
      });
      list.push({
        id: "land",
        label: "Request landing",
        say: `${a.name} Tower, ${this.callsign} ${this.runway}, full stop.`,
      });
    }
    if (fm.onGround && this.airborne) {
      list.push({
        id: "taxi-in",
        label: "Request taxi to gate",
        say: `${a.name} Ground, ${this.callsign} clear of ${this.runway}, request taxi to the gate.`,
      });
    }
    list.push({
      id: "atis",
      label: "Listen ATIS",
      say: `${this.callsign} requesting current ATIS.`,
    });
    list.push({
      id: "sayagain",
      label: "Say again",
      say: `${this.callsign}, say again.`,
    });
    list.push({
      id: "unable",
      label: "Unable",
      say: `${this.callsign}, unable.`,
    });
    list.push({
      id: "wilco",
      label: "Wilco / Roger",
      say: `Roger, ${this.callsign}.`,
    });
    list.push({
      id: "pan",
      label: "PAN-PAN",
      say: `PAN PAN PAN, ${this.callsign}, requesting priority handling, no emergency yet.`,
    });
    list.push({
      id: "mayday",
      label: "MAYDAY",
      say: `MAYDAY MAYDAY MAYDAY, ${this.callsign}, declaring an emergency, request vectors to nearest runway.`,
    });
    return list;
  }

  transmit(id: string, fm: FlightModel): AtcMessage[] {
    const choice = this.choices(fm).find((c) => c.id === id);
    if (!choice) return [];
    this.say("PILOT", this.facility, choice.say);
    const replies = this.reply(id, fm);
    for (const r of replies) this.say("ATC", r.facility, r.text);
    return this.log.slice(-replies.length - 1);
  }

  private reply(id: string, fm: FlightModel): { facility: AtcFacility; text: string }[] {
    const a = this.airport;
    const cs = this.callsign;
    switch (id) {
      case "clr":
        this.clearance = true;
        this.facility = "CLR";
        return [
          {
            facility: "CLR",
            text: `${cs}, ${a.name} Clearance, cleared to ${this.dest} via Kennedy Five departure, then as filed. Climb via SID except maintain 5,000. Departure on ${a.frequencies.departure}. Squawk ${this.squawk}.`,
          },
          {
            facility: "CLR",
            text: `${cs}, readback correct. Contact Ground ${a.frequencies.ground} for push.`,
          },
        ];
      case "push":
        this.pushed = true;
        this.facility = "GND";
        fm.controls.parkingBrake = false;
        return [
          {
            facility: "GND",
            text: `${cs}, push and start approved, tail south. Advise ready to taxi.`,
          },
        ];
      case "taxi":
        this.taxi = true;
        this.facility = "GND";
        return [
          {
            facility: "GND",
            text: `${cs}, taxi to runway ${this.runway} via ${this.taxiRoute}. Hold short of ${this.runway}.`,
          },
        ];
      case "ready":
        this.takeoff = true;
        this.facility = "TWR";
        return [
          {
            facility: "TWR",
            text: `${cs}, runway ${this.runway}, wind 130 at 10, fly runway heading, cleared for takeoff.`,
          },
        ];
      case "higher":
        this.clearedAltitude = 24000;
        this.facility = "DEP";
        fm.ap.altitudeFt = 24000;
        return [
          {
            facility: "DEP",
            text: `${cs}, climb and maintain flight level 240. Traffic 11 o'clock, 6 miles, westbound, 7,000.`,
          },
        ];
      case "vectors":
        this.facility = "APP";
        fm.ap.loc = true;
        fm.ap.app = true;
        fm.ap.master = true;
        return [
          {
            facility: "APP",
            text: `${cs}, turn heading ${this.clearedHeading}, maintain 3,000 until established, cleared ILS runway ${this.runway} approach.`,
          },
        ];
      case "land":
        this.facility = "TWR";
        return [
          {
            facility: "TWR",
            text: `${cs}, runway ${this.runway}, wind 130 at 10, cleared to land. Exit left when able, contact Ground ${a.frequencies.ground}.`,
          },
        ];
      case "taxi-in":
        this.landed = true;
        this.facility = "GND";
        return [
          {
            facility: "GND",
            text: `${cs}, taxi to gate ${this.gate} via Alpha. Follow the marshaller. Watch the tug on your right.`,
          },
        ];
      case "atis":
        return [
          {
            facility: "ATIS",
            text: `${a.icao} Romeo: wind 130 at 10, vis 10, few 035, 21/12, 3025, ILS ${this.runway}.`,
          },
        ];
      case "sayagain":
        return [
          {
            facility: this.facility,
            text: `${cs}, I say again: ${this.log.filter((m) => m.from === "ATC").at(-1)?.text ?? "stand by."}`,
          },
        ];
      case "unable":
        return [{ facility: this.facility, text: `${cs}, roger, unable. Say intentions.` }];
      case "wilco":
        return [{ facility: this.facility, text: `${cs}, roger.` }];
      case "pan":
        return [
          {
            facility: "CTR",
            text: `${cs}, New York, PAN acknowledged. Squawk 7700 if required, say souls on board and fuel remaining.`,
          },
        ];
      case "mayday":
        fm.ap.master = true;
        fm.ap.app = true;
        return [
          {
            facility: "TWR",
            text: `${cs}, MAYDAY acknowledged. Radar contact. Cleared to land any runway. Emergency equipment rolling. Fly heading ${this.runway} localizer, descend at your discretion.`,
          },
        ];
      default:
        return [{ facility: this.facility, text: `${cs}, stand by.` }];
    }
  }

  tick(fm: FlightModel) {
    if (!this.airborne && !fm.onGround && fm.radioAlt > 50) {
      this.airborne = true;
      this.facility = "DEP";
      this.say(
        "ATC",
        "TWR",
        `${this.callsign}, contact New York Departure ${this.airport.frequencies.departure}. Good day.`,
      );
      this.say(
        "ATC",
        "DEP",
        `${this.callsign}, New York Departure, radar contact. Climb via SID, maintain 5,000.`,
      );
    }
    if (this.airborne && fm.onGround && fm.gsKt < 40 && !this.landed) {
      this.say("ATC", "TWR", `${this.callsign}, turn left next taxiway, contact Ground ${this.airport.frequencies.ground}.`);
    }
  }

  private say(from: AtcMessage["from"], facility: AtcFacility, text: string) {
    this.log.push({ from, facility, text, ts: Date.now() });
    if (this.log.length > 80) this.log.shift();
  }
}
