/**
 * Quick-Log applier (WO-HLMED-002) — parsed entries -> real rows via the same
 * canonical write paths as manual entry (slot-upsert + inventory consumption
 * for meds; direct Measurement creates for BP/glucose). Side effects (rollups,
 * cache invalidation, arrivals, reminders, floor check, compliance) mirror the
 * existing create arms so Quick-Log behaves identically to manual logging.
 */
import type { GlucoseContext, MeasurementType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auth/audit";
import {
  invalidateUserMeasurements,
  invalidateUserMedications,
} from "@/lib/cache/invalidate";
import {
  applyCanonicalSlotWrite,
  resolveSlotForWriteByBand,
} from "@/lib/medications/scheduling/slot-upsert";
import { consumeForIntake } from "@/lib/medications/inventory/consumption";
import { afterMeasurementMutation } from "@/lib/rollups/after-measurement-mutation";
import { enqueueReminderSatisfy } from "@/lib/jobs/reminder-satisfy";
import { emitInsertedMeasurementArrivals } from "@/lib/arrivals/measurement-emit";
import { runSafetyFloorCheck } from "@/lib/illness/safety-floor-check";
import { recomputeMedicationComplianceForEvent } from "@/lib/rollups/medication-compliance-rollups";
import type { QuickLogEntry } from "./parse";

const BP_SYS_TYPE: MeasurementType = "BLOOD_PRESSURE_SYS";
const BP_DIA_TYPE: MeasurementType = "BLOOD_PRESSURE_DIA";
const PULSE_TYPE: MeasurementType = "PULSE";
const GLUCOSE_TYPE: MeasurementType = "BLOOD_GLUCOSE";
const BP_UNIT = "mmHg";
const PULSE_UNIT = "bpm";
const GLUCOSE_UNIT = "mg/dL";

function mapGlucoseContext(hint: string | undefined): GlucoseContext | undefined {
  if (!hint) return undefined;
  const canonical = hint.startsWith("after_") ? "POSTPRANDIAL" : hint.toUpperCase();
  return (["FASTING", "POSTPRANDIAL", "RANDOM", "BEDTIME"] as const).find(
    (v) => v === canonical,
  );
}

function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Wall-clock h:m today in userTz -> UTC instant (Intl two-pass, DST-safe; stdlib only). */
function zonedTodayAt(userTz: string, h: number, m: number, now: Date): Date {
  const wall = new Date(now.getTime() + tzOffsetMinutes(now, userTz) * 60000);
  const guess = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), h, m, 0);
  const refined = tzOffsetMinutes(new Date(guess), userTz);
  return new Date(guess - refined * 60000);
}

export interface QuickLogApplyResult {
  kind: string;
  created: boolean;
  id?: string;
  summary: string;
}

export interface QuickLogApplyResponse {
  results: QuickLogApplyResult[];
}

export async function applyQuickLogEntries(input: {
  userId: string;
  userTz: string;
  ipAddress: string | null;
  entries: QuickLogEntry[];
}): Promise<QuickLogApplyResponse> {
  const { userId, userTz, ipAddress, entries } = input;
  const now = new Date();
  const results: QuickLogApplyResult[] = [];
  const mrows: Array<{ type: MeasurementType; measuredAt: Date; id?: string }> = [];
  const written: Array<{
    type: MeasurementType;
    value: number;
    measuredAt: Date;
    glucoseContext?: GlucoseContext | null;
  }> = [];
  let touchedMeasurements = false;
  let touchedMedications = false;

  for (const entry of entries) {
    if (entry.kind === "blood_pressure") {
      const rows = await prisma.$transaction([
        prisma.measurement.create({ data: { userId, type: BP_SYS_TYPE, value: entry.systolic, unit: BP_UNIT, source: "MANUAL", measuredAt: now } }),
        prisma.measurement.create({ data: { userId, type: BP_DIA_TYPE, value: entry.diastolic, unit: BP_UNIT, source: "MANUAL", measuredAt: now } }),
        ...(entry.pulse != null
          ? [prisma.measurement.create({ data: { userId, type: PULSE_TYPE, value: entry.pulse, unit: PULSE_UNIT, source: "MANUAL", measuredAt: now } })]
          : []),
      ]);
      for (const r of rows) {
        mrows.push({ type: r.type, measuredAt: now, id: r.id });
        written.push({ type: r.type, value: r.value, measuredAt: now });
      }
      results.push({ kind: "blood_pressure", created: true, id: rows[0]?.id, summary: entry.systolic + "/" + entry.diastolic + " mmHg logged" });
      touchedMeasurements = true;
    } else if (entry.kind === "glucose") {
      const mappedCtx = mapGlucoseContext(entry.context);
      const row = await prisma.measurement.create({
        data: {
          userId,
          type: GLUCOSE_TYPE,
          value: entry.value,
          unit: GLUCOSE_UNIT,
          ...(mappedCtx ? { glucoseContext: mappedCtx } : {}),
          source: "MANUAL",
          measuredAt: now,
        },
      });
      mrows.push({ type: row.type, measuredAt: now, id: row.id });
      written.push({ type: GLUCOSE_TYPE, value: entry.value, measuredAt: now, glucoseContext: mappedCtx ?? null });
      results.push({
        kind: "glucose",
        created: true,
        id: row.id,
        summary: entry.value + " mg/dL" + (mappedCtx ? " (" + mappedCtx.toLowerCase() + ")" : "") + " logged",
      });
      touchedMeasurements = true;
    } else {
      const med = await prisma.medication.findFirst({
        where: { userId, name: { mode: "insensitive", equals: entry.name }, active: true },
        select: { id: true, name: true },
      });
      if (!med) {
        results.push({
          kind: "medication_intake",
          created: false,
          summary: 'No medication named "' + entry.name + '" found - add it first',
        });
        continue;
      }
      const takenAt = entry.time ? zonedTodayAt(userTz, entry.time.h, entry.time.m, now) : now;
      const slot = await resolveSlotForWriteByBand({
        userId,
        medicationId: med.id,
        userTz,
        takenAt,
        now,
      });
      // Ad-hoc / PRN (no expected slots) -> standalone row anchored at takenAt.
      const canonicalSlot = slot.slotInstant ?? takenAt;
      const write = await prisma.$transaction(async (tx) => {
        const applied = await applyCanonicalSlotWrite({
          client: tx,
          userId,
          medicationId: med.id,
          canonicalSlot,
          takenAt,
          skipped: false,
          isExplicitTaken: true,
          isExplicitSkip: false,
          idempotencyKey: null,
          createSource: "WEB",
        });
        // Only a pending -> taken transition consumes inventory (the intake
        // routes' pattern); a re-post of an already-taken slot is a no-op.
        if (applied.consumedTransition) {
          await consumeForIntake({
            client: tx,
            userId,
            medicationId: med.id,
            eventId: applied.row.id,
            intakeAt: takenAt,
          });
        }
        return applied;
      });
      touchedMedications = true;
      await recomputeMedicationComplianceForEvent({
        userId,
        medicationId: med.id,
        scheduledFor: canonicalSlot,
        tz: userTz,
      });
      void enqueueReminderSatisfy(userId);
      const timeLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: userTz,
        hour: "numeric",
        minute: "2-digit",
      }).format(takenAt);
      results.push({
        kind: "medication_intake",
        created: true,
        id: write.row.id,
        summary: med.name + " logged at " + timeLabel,
      });
    }
  }

  if (touchedMeasurements) {
    await afterMeasurementMutation(userId, mrows, "quick-log");
    await invalidateUserMeasurements(userId, { evict: true });
    void emitInsertedMeasurementArrivals(userId, mrows, "WEB");
    void runSafetyFloorCheck({ userId, written, timezone: userTz });
  }
  if (touchedMedications) {
    await invalidateUserMedications(userId, { evict: true });
  }
  await auditLog("quick_log.apply", {
    userId,
    ipAddress,
    details: {
      count: results.filter((r) => r.created).length,
      kinds: Array.from(new Set(results.map((r) => r.kind))),
    },
  });
  return { results };
}
