/**
 * Quick-Log natural-language parser — server-only module.
 *
 * Two layers:
 *   1. CADIS gateway (primary): OpenAI-compatible /chat/completions call
 *      that extracts structured intents. Server-side only — the bearer
 *      token is read from process.env here and never reaches the client
 *      bundle.
 *   2. Deterministic regex fallback: runs whenever CADIS is unset,
 *      unreachable, slow, or returns something the zod schema rejects.
 *
 * The parser never fabricates: text it cannot attribute to an entry comes
 * back as `unparsed` so the UI can say so instead of writing junk.
 */
import { z } from "zod/v4";

/** CADIS-side glucose context hint, mapped to GlucoseContext by the route. */
export type GlucoseContextHint =
  | "after_breakfast"
  | "after_lunch"
  | "after_dinner"
  | "fasting"
  | "bedtime";

export type QuickLogEntry =
  | {
      kind: "blood_pressure";
      systolic: number;
      diastolic: number;
      pulse?: number;
    }
  | { kind: "glucose"; value: number; context?: GlucoseContextHint }
  | {
      kind: "medication_intake";
      name: string;
      /** Local wall-clock time, or null = "now" (route resolves to UTC). */
      time: { h: number; m: number } | null;
    };

export interface QuickLogParseResult {
  entries: QuickLogEntry[];
  /** Leftover text the parser could not attribute to any entry. */
  unparsed?: string;
}

const CADIS_BASE = process.env.CADIS_BASE_URL || "https://cadis.geniuzs.com/v1";
const CADIS_MODEL = process.env.CADIS_MODEL || "cadis-light";

const CADIS_SYSTEM_PROMPT =
  'Extract health-log intents from the user text. Reply ONLY with JSON, no ' +
  'prose, no markdown: {"entries":[{"kind":"medication_intake","name":"' +
  'medication name","time":"HH:mm or natural language time"} | {"kind":"' +
  'blood_pressure","systolic":number,"diastolic":number,"pulse":number?} | ' +
  '{"kind":"glucose","value":number,"context":"after_breakfast|after_lunch|' +
  'after_dinner|fasting|bedtime"}]}. Omit keys that are not present in the ' +
  'text. Never invent readings that are not in the text. If nothing can be ' +
  'extracted reply {"entries":[]}.';

const cadisResponseSchema = z.object({
  entries: z
    .array(
      z.union([
        z.object({
          kind: z.literal("blood_pressure"),
          systolic: z.number(),
          diastolic: z.number(),
          pulse: z.number().optional(),
        }),
        z.object({
          kind: z.literal("glucose"),
          value: z.number(),
          context: z.string().optional(),
        }),
        z.object({
          kind: z.literal("medication_intake"),
          name: z.string().min(1),
          time: z.string().optional(),
        }),
      ]),
    )
    .max(8),
});

const GLUCOSE_HINTS: Record<string, GlucoseContextHint> = {
  after_breakfast: "after_breakfast",
  after_lunch: "after_lunch",
  after_dinner: "after_dinner",
  fasting: "fasting",
  bedtime: "bedtime",
};

function mapGlucoseContext(raw: string | undefined): GlucoseContextHint | undefined {
  if (!raw) return undefined;
  return GLUCOSE_HINTS[raw.trim().toLowerCase()];
}

/**
 * Parse "8", "8:30", "8am", "8:30pm", "14:30" into local wall-clock
 * {h, m}. Returns null when nothing parseable is present.
 */
export function parseLooseTime(raw: string): { h: number; m: number } | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem?.startsWith("p")) {
    if (h < 12) h += 12;
  } else if (meridiem?.startsWith("a")) {
    if (h === 12) h = 0;
  }
  if (h > 23 || m > 59) return null;
  return { h, m };
}

/**
 * Deterministic fallback layer. Each pattern strips what it matched from
 * the working text; whatever still looks like content afterwards is
 * reported as `unparsed` rather than silently dropped.
 */
export function fallbackParse(text: string): QuickLogParseResult {
  const entries: QuickLogEntry[] = [];
  let working = " " + text + " ";

  // Blood pressure: "BP 128/82", "128 over 82", "blood pressure 128/82".
  const bpRe =
    /(?:\b(?:bp|blood\s+pressure)\b\s*)?(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i;
  const bp = working.match(bpRe);
  if (bp) {
    const systolic = Number(bp[1]);
    const diastolic = Number(bp[2]);
    if (systolic >= 40 && systolic <= 300 && diastolic >= 20 && diastolic <= 200) {
      const entry: QuickLogEntry = { kind: "blood_pressure", systolic, diastolic };
      const pulseMatch = working.match(/\bpulse\b\D{0,10}?(\d{2,3})\b/i);
      if (pulseMatch) {
        const pulse = Number(pulseMatch[1]);
        if (pulse >= 20 && pulse <= 300) entry.pulse = pulse;
      }
      entries.push(entry);
      working = working.replace(bpRe, " ");
      if (pulseMatch) working = working.replace(pulseMatch[0], " ");
    }
  }

  // Blood glucose: "sugar 110 after breakfast", "glucose 95 fasting".
  const glucoseRe = /\b(?:sugar|glucose|bg)\b\D{0,10}?(\d{2,3})\b/i;
  const glucose = working.match(glucoseRe);
  if (glucose) {
    const value = Number(glucose[1]);
    if (value >= 20 && value <= 800) {
      const ctxMatch = working.match(
        /\b(after\s+breakfast|after\s+lunch|after\s+dinner|fasting|bedtime)\b/i,
      );
      const entry: QuickLogEntry = { kind: "glucose", value };
      if (ctxMatch) {
        entry.context = mapGlucoseContext(ctxMatch[1].replace(/\s+/g, "_"));
        working = working.replace(ctxMatch[0], " ");
      }
      entries.push(entry);
      working = working.replace(glucoseRe, " ");
    }
  }

  // Medication intake: "took lisinopril at 8am", "took metformin 8:30pm".
  const medRe =
    /\b(?:took|taking|take|taken)\s+([a-z][a-z0-9\-]*(?:\s+[a-z0-9\-]+){0,3}?)\s*(?:at|@|\s)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i;
  const med = working.match(medRe);
  if (med) {
    const name = med[1].trim();
    const time = parseLooseTime(med[2]);
    if (name.length >= 2) {
      entries.push({ kind: "medication_intake", name, time });
      working = working.replace(med[0], " ");
    }
  }

  // Anything left that still looks like content is unparsed, not dropped.
  const leftover = working.replace(/\b(?:and|the|my|at|is|was|logged|log|to)\b/gi, " ")
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (leftover.length > 0) return { entries, unparsed: leftover };
  return { entries };
}

/**
 * CADIS layer. Returns null on ANY failure (unset token, non-2xx, timeout,
 * malformed JSON, schema mismatch) — the caller then falls back to the
 * regex layer. Never throws.
 */
async function cadisExtract(text: string): Promise<QuickLogEntry[] | null> {
  const token = process.env.CADIS_API_TOKEN;
  if (!token) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(CADIS_BASE + "/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token,
      },
      // Reasoning model: small max_tokens budgets return empty content.
      body: JSON.stringify({
        model: CADIS_MODEL,
        max_tokens: 600,
        messages: [
          { role: "system", content: CADIS_SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    const json = cadisResponseSchema.safeParse(
      JSON.parse(content.slice(start, end + 1)),
    );
    if (!json.success) return null;
    const out: QuickLogEntry[] = [];
    for (const e of json.data.entries) {
      if (e.kind === "blood_pressure") {
        out.push({ kind: e.kind, systolic: e.systolic, diastolic: e.diastolic, ...(e.pulse !== undefined ? { pulse: e.pulse } : {}) });
      } else if (e.kind === "glucose") {
        const ctx = mapGlucoseContext(e.context);
        out.push({ kind: e.kind, value: e.value, ...(ctx ? { context: ctx } : {}) });
      } else {
        const time = e.time ? parseLooseTime(e.time) : null;
        out.push({ kind: e.kind, name: e.name, time });
      }
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Public entry point: CADIS first, deterministic fallback second. On a
 * total failure the full text is returned as `unparsed` — never
 * fabricated entries.
 */
export async function parseQuickLogText(
  text: string,
): Promise<QuickLogParseResult> {
  const trimmed = text.trim();
  if (!trimmed) return { entries: [], unparsed: text };
  const fromCadis = await cadisExtract(trimmed);
  if (fromCadis && fromCadis.length > 0) {
    return { entries: fromCadis };
  }
  const fallback = fallbackParse(trimmed);
  if (fallback.entries.length > 0 || fallback.unparsed) return fallback;
  return { entries: [], unparsed: trimmed };
}
