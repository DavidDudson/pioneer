import { InjectionToken } from '@angular/core';

/** Upper bound on waiting for idle, so prefetch still happens on a busy page. */
const IDLE_TIMEOUT_MS = 2000;
/** Browsers without `requestIdleCallback` (Safari) run the task after this delay instead. */
const FALLBACK_DELAY_MS = 200;

export type IdleScheduler = (task: () => void) => void;

function scheduleWhenIdle(task: () => void): void {
  if ('requestIdleCallback' in globalThis) {
    requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return;
  }
  setTimeout(task, FALLBACK_DELAY_MS);
}

/** Runs low-priority work when the browser is idle. Tests replace it to run work on demand. */
export const IDLE_SCHEDULER = new InjectionToken<IdleScheduler>('IDLE_SCHEDULER', {
  providedIn: 'root',
  factory: (): IdleScheduler => scheduleWhenIdle,
});
