/**
 * Quick-Log endpoint (WO-HLMED-002) — POST { text, timezone }.
 * Server-only CADIS parsing (token never leaves the server); auth +
 * record-write rate limit + zod validation, then parse -> apply.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, requireAuth } from "@/lib/api-handler";
import {
  apiError,
  apiSuccess,
  getClientIp,
  safeJson,
} from "@/lib/api-response";
import { checkRecordWriteRateLimit } from "@/lib/rate-limit";
import { parseQuickLogText } from "@/lib/quick-log/parse";
import { applyQuickLogEntries } from "@/lib/quick-log/apply";

const bodySchema = z.object({
  text: z.string().min(1).max(280),
  timezone: z.string().min(1).max(64),
});

export const POST = apiHandler(
  async (request: NextRequest): Promise<Response> => {
    const { user } = await requireAuth();

    // Shared per-account write ceiling — same posture as every other
    // interactive create route.
    const writeRl = await checkRecordWriteRateLimit(user.id);
    if (!writeRl.allowed) {
      return apiError("Too many writes, try again later", 429, {
        errorCode: "record_write.rate_limited",
      });
    }

    const { data: body, error: jsonError } = await safeJson(request, {
      maxBytes: 8 * 1024,
    });
    if (jsonError) return jsonError;

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Provide text (1-280 chars) and a timezone", 400);
    }

    try {
      new Intl.DateTimeFormat(parsed.data.timezone);
    } catch {
      return apiError("Unknown timezone", 400);
    }

    const parsedLog = await parseQuickLogText(parsed.data.text);
    const applied = await applyQuickLogEntries({
      userId: user.id,
      userTz: parsed.data.timezone,
      ipAddress: getClientIp(request),
      entries: parsedLog.entries,
    });

    return apiSuccess({
      entries: applied.results,
      unparsed: parsedLog.unparsed ?? null,
    });
  },
);
