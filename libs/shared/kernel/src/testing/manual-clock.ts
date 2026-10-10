import type { Clock } from '../clock';
import { Temporal } from '../temporal';

/** A clock tests move by hand: starts at `start` and reads the same until advanced. */
export class ManualClock implements Clock {
  #now: Temporal.Instant;

  public constructor(start: string) {
    this.#now = Temporal.Instant.from(start);
  }

  public now(): Temporal.Instant {
    return this.#now;
  }

  public advance(duration: Temporal.Duration): void {
    this.#now = this.#now.add(duration);
  }
}
