import { Milliseconds } from '@pioneer/shared/kernel';

/** Simulated server latency for stories: long enough to see the pending state. */
const STORY_LATENCY: Milliseconds = Milliseconds.parse(1200);

/** Resolves after `STORY_LATENCY`, like a request that succeeds. */
export async function succeedSlowly(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, STORY_LATENCY);
  await promise;
}

/** Rejects after `STORY_LATENCY`, like a request that fails. */
export async function failSlowly(): Promise<never> {
  await succeedSlowly();
  throw new Error('Story failure');
}
