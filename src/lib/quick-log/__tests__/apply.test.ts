import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auth/audit";
import {
  invalidateUserMeasurements,
  invalidateUserMedications,
} from "@/lib/cache/invalidate";
import {
  resolveSlotForWriteByBand,
  applyCanonicalSlotWrite,
} from "@/lib/medications/scheduling/slot-upsert";
import { consumeForIntake } from "@/lib/medications/inventory/consumption";
import { afterMeasurementMutation } from "@/lib/rollups/after-measurement-mutation";
import { emitInsertedMeasurementArrivals } from "@/lib/arrivals/measurement-emit";
import { runSafetyFloorCheck } from "@/lib/illness/safety-floor-check";
import { recomputeMedicationComplianceForEvent } from "@/lib/rollups/medication-compliance-rollups";

vi.mock("@/lib/db", () => ({
  prisma: {
    measurement: { create: vi.fn() },
    medication: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth/audit", () => ({ auditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/cache/invalidate", () => ({
  invalidateUserMeasurements: vi.fn().mockResolvedValue(undefined),
  invalidateUserMedications: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/medications/scheduling/slot-upsert", () => ({
  resolveSlotForWriteByBand: vi.fn(),
  applyCanonicalSlotWrite: vi.fn(),
}));
vi.mock("@/lib/medications/inventory/consumption", () => ({
  consumeForIntake: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/rollups/after-measurement-mutation", () => ({
  afterMeasurementMutation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/jobs/reminder-satisfy", () => ({
  enqueueReminderSatisfy: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/arrivals/measurement-emit", () => ({
  emitInsertedMeasurementArrivals: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/illness/safety-floor-check", () => ({
  runSafetyFloorCheck: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/rollups/medication-compliance-rollups", () => ({
  recomputeMedicationComplianceForEvent: vi.fn().mockResolvedValue(undefined),
}));

type VMock = import("vitest").Mock;
const mCreate = prisma.measurement.create as unknown as VMock;
const mFind = prisma.medication.findFirst as unknown as VMock;
const mTx = prisma.$transaction as unknown as VMock;
const mAudit = auditLog as unknown as VMock;
const mInvM = invalidateUserMeasurements as unknown as VMock;
const mInvMed = invalidateUserMedications as unknown as VMock;
const mSlot = resolveSlotForWriteByBand as unknown as VMock;
const mApplySlot = applyCanonicalSlotWrite as unknown as VMock;
const mConsume = consumeForIntake as unknown as VMock;
const mAfter = afterMeasurementMutation as unknown as VMock;
const mEmit = emitInsertedMeasurementArrivals as unknown as VMock;
const mFloor = runSafetyFloorCheck as unknown as VMock;
const mRecompute = recomputeMedicationComplianceForEvent as unknown as VMock;

import { applyQuickLogEntries } from "../apply";

describe("applyQuickLogEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mTx.mockImplementation(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)({}),
    );
  });

  it("BP: writes canonical row(s), summary + full side-effect chain", async () => {
    mCreate.mockResolvedValue({ id: "m1", type: "x" });
    const res = await applyQuickLogEntries({
      userId: "u1",
      userTz: "UTC",
      ipAddress: null,
      entries: [{ kind: "blood_pressure", systolic: 128, diastolic: 82, pulse: 70 }] as never,
    });
    expect(res.results[0].created).toBe(true);
    expect(res.results[0].summary).toContain("128/82");
    expect(res.results[0].summary).toContain("mmHg");
    expect(mCreate).toHaveBeenCalled();
    expect(mAfter).toHaveBeenCalled();
    expect(mInvM).toHaveBeenCalled();
    expect(mEmit).toHaveBeenCalled();
    expect(mFloor).toHaveBeenCalled();
    expect(mAudit).toHaveBeenCalled();
  });

  it("glucose: creates row; context mapped when column exists", async () => {
    mCreate.mockResolvedValue({ id: "m2", type: "g" });
    const res = await applyQuickLogEntries({
      userId: "u1",
      userTz: "UTC",
      ipAddress: null,
      entries: [{ kind: "glucose", value: 110, context: "after_breakfast" }] as never,
    });
    expect(res.results[0].created).toBe(true);
    expect(res.results[0].summary).toContain("110");
    expect(res.results[0].summary).toContain("mg/dL");
    expect(JSON.stringify(mCreate.mock.calls)).toContain("POSTPRANDIAL");
  });

  it("unknown medication: created:false, explanatory summary, NO writes", async () => {
    mFind.mockResolvedValue(null);
    const res = await applyQuickLogEntries({
      userId: "u1",
      userTz: "UTC",
      ipAddress: null,
      entries: [{ kind: "medication_intake", name: "Zzz", time: null }] as never,
    });
    expect(res.results[0].created).toBe(false);
    expect(res.results[0].summary).toContain("Zzz");
    expect(mApplySlot).not.toHaveBeenCalled();
    expect(mConsume).not.toHaveBeenCalled();
    expect(mInvMed).not.toHaveBeenCalled();
  });

  it("known medication: slot write + consume + compliance + invalidate", async () => {
    mFind.mockResolvedValue({ id: "med1", name: "Lisinopril" });
    mSlot.mockResolvedValue({ slotInstant: new Date("2026-10-03T06:00:00Z"), status: null, hasExpectedSlots: true });
    mApplySlot.mockResolvedValue({ row: { id: "evt1" }, consumedTransition: true });
    const res = await applyQuickLogEntries({
      userId: "u1",
      userTz: "UTC",
      ipAddress: null,
      entries: [{ kind: "medication_intake", name: "lisinopril", time: { h: 8, m: 0 } }] as never,
    });
    expect(res.results[0].created).toBe(true);
    expect(res.results[0].id).toBe("evt1");
    expect(res.results[0].summary).toContain("Lisinopril logged at");
    expect(mApplySlot).toHaveBeenCalled();
    expect(mConsume).toHaveBeenCalled();
    expect(mRecompute).toHaveBeenCalled();
    expect(mInvMed).toHaveBeenCalled();
    expect(mAudit).toHaveBeenCalled();
  });
});
