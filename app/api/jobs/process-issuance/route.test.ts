import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

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
