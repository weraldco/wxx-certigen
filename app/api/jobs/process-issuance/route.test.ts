import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, handleJobFailure } from "./route";
import { MAX_ISSUANCE_ATTEMPTS } from "@/lib/jobs/backoff";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

describe("POST /api/jobs/process-issuance", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("rejects requests with the wrong bearer token", async () => {
    const request = new NextRequest("https://certigen.example.com/api/jobs/process-issuance", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("rejects requests with no authorization header", async () => {
    const request = new NextRequest("https://certigen.example.com/api/jobs/process-issuance", { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

type CapturedWrite = { table: string; payload: unknown };

/**
 * A hand-rolled fake of the subset of the Supabase client `handleJobFailure`
 * calls. Tests assert on the SHAPE of the update/insert payload it sends —
 * that shape is the actual contract with the database — rather than mocking
 * behavior.
 */
function makeFakeSupabaseAdmin(captured: CapturedWrite[]) {
  return {
    from(table: string) {
      return {
        update(payload: unknown) {
          return {
            eq() {
              captured.push({ table, payload });
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload: unknown) {
          captured.push({ table, payload });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as ReturnType<typeof createSupabaseAdminClient>;
}

const baseJob = {
  job_id: "job-1",
  enrollment_id: "enrollment-1",
  organization_id: "org-1",
  config_version: 1,
  attempts: 0,
};

describe("handleJobFailure", () => {
  it("re-queues a job below the retry ceiling with incremented attempts and a future available_at", async () => {
    const captured: CapturedWrite[] = [];
    const supabaseAdmin = makeFakeSupabaseAdmin(captured);
    const job = { ...baseJob, attempts: MAX_ISSUANCE_ATTEMPTS - 2 };

    await handleJobFailure(supabaseAdmin, job, new Error("boom"));

    expect(captured).toHaveLength(1);
    const [write] = captured;
    expect(write.table).toBe("jobs");
    const payload = write.payload as Record<string, unknown>;
    expect(payload.status).toBe("queued");
    expect(payload.attempts).toBe(job.attempts + 1);
    expect(payload.last_error).toBe("boom");
    expect(typeof payload.available_at).toBe("string");
    expect(new Date(payload.available_at as string).getTime()).toBeGreaterThan(Date.now());
  });

  it("marks a job at the retry ceiling as failed and records an activity event", async () => {
    const captured: CapturedWrite[] = [];
    const supabaseAdmin = makeFakeSupabaseAdmin(captured);
    const job = { ...baseJob, attempts: MAX_ISSUANCE_ATTEMPTS - 1 };

    await handleJobFailure(supabaseAdmin, job, new Error("permanent failure"));

    expect(captured).toHaveLength(2);

    const jobsWrite = captured.find((c) => c.table === "jobs");
    expect(jobsWrite).toBeDefined();
    const jobsPayload = jobsWrite!.payload as Record<string, unknown>;
    expect(jobsPayload.status).toBe("failed");
    expect(jobsPayload.attempts).toBe(job.attempts + 1);
    expect(jobsPayload.available_at).toBeUndefined();

    const activityWrite = captured.find((c) => c.table === "activity_events");
    expect(activityWrite).toBeDefined();
    const activityPayload = activityWrite!.payload as Record<string, unknown>;
    expect(activityPayload.organization_id).toBe(job.organization_id);
    expect(activityPayload.entity_id).toBe(job.job_id);
    expect(activityPayload.action).toBe("issuance_failed");
  });

  it("does not throw even for a non-Error rejection and an unstubbed dependency", async () => {
    const captured: CapturedWrite[] = [];
    const supabaseAdmin = makeFakeSupabaseAdmin(captured);
    const job = { ...baseJob, attempts: 0 };

    await expect(handleJobFailure(supabaseAdmin, job, "a plain string rejection")).resolves.toBeUndefined();
  });
});
