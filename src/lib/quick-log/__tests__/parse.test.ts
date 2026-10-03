import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackParse, parseLooseTime, parseQuickLogText } from "../parse";

describe("parseLooseTime", () => {
  it("parses meridiem and 24h forms", () => {
    expect(parseLooseTime("8am")).toEqual({ h: 8, m: 0 });
    expect(parseLooseTime("8:30pm")).toEqual({ h: 20, m: 30 });
    expect(parseLooseTime("14:30")).toEqual({ h: 14, m: 30 });
    expect(parseLooseTime("12am")).toEqual({ h: 0, m: 0 });
    expect(parseLooseTime("12pm")).toEqual({ h: 12, m: 0 });
    expect(parseLooseTime("25:00")).toBeNull();
    expect(parseLooseTime("nonsense")).toBeNull();
  });
});

describe("fallbackParse", () => {
  it("parses BP with optional pulse", () => {
    expect(fallbackParse("BP 128 over 82 pulse 70")).toEqual({
      entries: [
        { kind: "blood_pressure", systolic: 128, diastolic: 82, pulse: 70 },
      ],
    });
  });

  it("parses slashed BP without prefix", () => {
    expect(fallbackParse("128/82").entries[0]).toMatchObject({
      kind: "blood_pressure",
      systolic: 128,
      diastolic: 82,
    });
  });

  it("parses glucose with and without context", () => {
    expect(fallbackParse("sugar 110 after breakfast")).toEqual({
      entries: [
        { kind: "glucose", value: 110, context: "after_breakfast" },
      ],
    });
    expect(fallbackParse("glucose 95")).toEqual({
      entries: [{ kind: "glucose", value: 95 }],
    });
  });

  it("parses medication intake times", () => {
    expect(fallbackParse("took lisinopril at 8am")).toEqual({
      entries: [
        { kind: "medication_intake", name: "lisinopril", time: { h: 8, m: 0 } },
      ],
    });
    expect(fallbackParse("took metformin 8:30pm").entries[0]).toMatchObject({
      kind: "medication_intake",
      name: "metformin",
      time: { h: 20, m: 30 },
    });
  });

  it("rejects implausible BP values", () => {
    const r = fallbackParse("999/12");
    expect(r.entries.filter((e) => e.kind === "blood_pressure")).toEqual([]);
  });

  it("garbage -> unparsed, never fabricated", () => {
    const r = fallbackParse("hello world this is not a reading");
    expect(r.entries).toEqual([]);
    expect(r.unparsed).toBeTruthy();
  });
});

describe("parseQuickLogText CADIS layer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses CADIS JSON when available", async () => {
    vi.stubEnv("CADIS_API_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  '{"entries":[{"kind":"blood_pressure","systolic":118,"diastolic":76,"pulse":64}]}',
              },
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await parseQuickLogText("bp 118/76 pulse 64");
    expect(r.entries).toEqual([
      { kind: "blood_pressure", systolic: 118, diastolic: 76, pulse: 64 },
    ]);
    expect(r.unparsed).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps glucose context hints from CADIS", async () => {
    vi.stubEnv("CADIS_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content:
                    '{"entries":[{"kind":"glucose","value":110,"context":"after_breakfast"}]}',
                },
              },
            ],
          }),
      }),
    );
    const r = await parseQuickLogText("sugar 110 after breakfast");
    expect(r.entries).toEqual([
      { kind: "glucose", value: 110, context: "after_breakfast" },
    ]);
  });

  it("falls back when CADIS returns garbage", async () => {
    vi.stubEnv("CADIS_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "I could not parse that." } }],
          }),
      }),
    );
    const r = await parseQuickLogText("BP 120/80");
    expect(r.entries[0]).toMatchObject({
      kind: "blood_pressure",
      systolic: 120,
      diastolic: 80,
    });
  });

  it("falls back when fetch throws", async () => {
    vi.stubEnv("CADIS_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const r = await parseQuickLogText("took metformin at 7am");
    expect(r.entries[0]).toMatchObject({
      kind: "medication_intake",
      name: "metformin",
      time: { h: 7, m: 0 },
    });
  });

  it("skips CADIS entirely when no token and garbage stays unparsed", async () => {
    vi.stubEnv("CADIS_API_TOKEN", "");
    const r = await parseQuickLogText("the quick brown fox");
    expect(r.entries).toEqual([]);
    expect(r.unparsed).toBeTruthy();
  });
});
