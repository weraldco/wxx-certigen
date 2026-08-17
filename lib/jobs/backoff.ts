export const MAX_ISSUANCE_ATTEMPTS = 6;

const BACKOFF_SCHEDULE_MS: Record<number, number> = {
  1: 60_000,
  2: 5 * 60_000,
  3: 15 * 60_000,
  4: 60 * 60_000,
  5: 6 * 60 * 60_000,
};

export function computeBackoffDelayMs(attempts: number): number {
  const delay = BACKOFF_SCHEDULE_MS[attempts];
  if (delay === undefined) {
    throw new RangeError(`No backoff delay defined for attempt ${attempts}`);
  }
  return delay;
}

export function isRetryable(attempts: number): boolean {
  return attempts < MAX_ISSUANCE_ATTEMPTS;
}
