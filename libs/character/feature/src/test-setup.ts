import { vi } from 'vitest';

/** How long `vi.waitFor` retries when a call names no timeout: vitest's 1 s is too short for a sheet on a busy runner. */
const WAIT_FOR_TIMEOUT = 20_000;

interface WaitOptions {
  readonly timeout?: number;
  readonly interval?: number;
}

const waitFor = vi.waitFor.bind(vi);

async function waitForLonger<TValue>(
  callback: () => TValue | Promise<TValue>,
  options?: number | WaitOptions,
): Promise<TValue> {
  return waitFor(callback, typeof options === 'number' ? options : { timeout: WAIT_FOR_TIMEOUT, ...options });
}

vi.waitFor = waitForLonger;

// One test may run 60 s: opening a sheet builds its registries, seconds on a busy runner.
vi.setConfig({ testTimeout: 60_000 });
