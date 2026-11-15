import { vi } from 'vitest';
import * as z from 'zod';

/** How long `vi.waitFor` retries when a call names no timeout: vitest's 1 s is too short for a sheet on a busy runner. */
const WAIT_FOR_TIMEOUT = 20_000;

interface WaitOptions {
  readonly timeout?: number;
  readonly interval?: number;
}

const waitFor = vi.waitFor.bind(vi);

const WaitBounds = z.looseObject({ timeout: z.number().default(WAIT_FOR_TIMEOUT), interval: z.number().optional() });

async function waitForLonger<TValue>(
  callback: () => TValue | Promise<TValue>,
  options?: number | WaitOptions,
): Promise<TValue> {
  const timeout = z.number().safeParse(options);
  const given = WaitBounds.parse(options ?? {});

  if (timeout.success) {
    return waitFor(callback, timeout.data);
  }

  const interval = given.interval === undefined ? {} : { interval: given.interval };

  return waitFor(callback, { timeout: given.timeout, ...interval });
}

vi.waitFor = waitForLonger;

// One test may run 60 s: opening a sheet builds its registries, seconds on a busy runner.
vi.setConfig({ testTimeout: 60_000 });
