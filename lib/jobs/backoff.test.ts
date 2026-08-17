import { describe, expect, it } from "vitest";
import { MAX_ISSUANCE_ATTEMPTS, computeBackoffDelayMs, isRetryable } from "./backoff";

describe("computeBackoffDelayMs", () => {
  it("returns the schedule: 1m, 5m, 15m, 1h, 6h", () => {
    expect(computeBackoffDelayMs(1)).toBe(60_000);
    expect(computeBackoffDelayMs(2)).toBe(5 * 60_000);
    expect(computeBackoffDelayMs(3)).toBe(15 * 60_000);
    expect(computeBackoffDelayMs(4)).toBe(60 * 60_000);
    expect(computeBackoffDelayMs(5)).toBe(6 * 60 * 60_000);
  });

  it("throws for an attempt count outside 1-5", () => {
    expect(() => computeBackoffDelayMs(0)).toThrow();
    expect(() => computeBackoffDelayMs(6)).toThrow();
  });
});

describe("isRetryable", () => {
  it("allows retries under the max attempt count", () => {
    expect(isRetryable(1)).toBe(true);
    expect(isRetryable(MAX_ISSUANCE_ATTEMPTS - 1)).toBe(true);
  });

  it("stops retrying once attempts reach the max", () => {
    expect(isRetryable(MAX_ISSUANCE_ATTEMPTS)).toBe(false);
    expect(isRetryable(MAX_ISSUANCE_ATTEMPTS + 1)).toBe(false);
  });

  it("has the correct boundary at 5 and 6", () => {
    expect(isRetryable(5)).toBe(true);
    expect(isRetryable(6)).toBe(false);
  });
});
