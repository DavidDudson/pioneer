import { Temporal } from './temporal';

/** Source of "now", injected so domain code stays deterministic in tests. */
export interface Clock {
  readonly now: () => Temporal.Instant;
}

export const systemClock: Clock = { now: () => Temporal.Now.instant() };

/** A clock frozen at an ISO instant, for tests. */
export function fixedClock(iso: string): Clock {
  const instant = Temporal.Instant.from(iso);
  return { now: () => instant };
}
