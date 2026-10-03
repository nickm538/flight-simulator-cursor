import type { Request, Response } from "express";

const TREE: Record<string, string> = {
  takeoff: "Runway {rwy}, wind 130 at 10, fly runway heading, cleared for takeoff.",
  taxi: "Taxi to runway {rwy} via Alpha Bravo, hold short {rwy}.",
  land: "Runway {rwy}, cleared to land. Exit when able.",
  gate: "Taxi to the gate via Alpha. Follow the marshaller.",
  push: "Push and start approved, tail south.",
};

export async function enhanceAtc(req: Request, res: Response) {
  const { prompt, rwy = "31L", callsign = "Southwest 1847" } = req.body as {
    prompt?: string;
    rwy?: string;
    callsign?: string;
  };
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const canned = TREE[String(prompt ?? "takeoff")] ?? `${callsign}, New York, roger, ${prompt ?? "stand by"}.`;
    res.json({ text: canned.replace("{rwy}", rwy), source: "offline" });
    return;
  }
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are New York TRACON / JFK tower. Reply with a single realistic FAA-style ATC transmission. No quotes, no markdown.",
          },
          { role: "user", content: `${callsign} on ${rwy}: ${prompt}` },
        ],
      }),
    });
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    res.json({ text: j.choices?.[0]?.message?.content ?? "Stand by.", source: "openai" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
