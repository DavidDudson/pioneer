import { describe, expect, test } from 'bun:test';

import { PackId } from '@pioneer/rules/sdk';

import type { StoredPackHash } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

const CORE = PackId.parse('core-rules');

function hashes(hash: string): readonly StoredPackHash[] {
  return [{ pack: CORE, hash }];
}

/** A build that counts its calls, and how many it has had. */
interface Counter {
  readonly calls: () => number;
  readonly build: () => Promise<number>;
}

/** A build that counts its calls and answers with the call number. */
function counter(): Counter {
  let calls = 0;
  return {
    calls: (): number => calls,
    build: async (): Promise<number> => {
      calls += 1;
      return calls;
    },
  };
}

async function failing(): Promise<number> {
  throw new Error('unreadable pack');
}

describe('HashKeyedCache', () => {
  test('keeps the value while the hashes are unchanged', async () => {
    const cache = new HashKeyedCache<number>();
    const { calls, build } = counter();

    const first = await cache.current(hashes('a'), build);
    const again = await cache.current(hashes('a'), build);

    expect([first, again, calls()]).toStrictEqual([1, 1, 1]);
  });

  test('builds again when the hashes change', async () => {
    const cache = new HashKeyedCache<number>();
    const { calls, build } = counter();

    await cache.current(hashes('a'), build);
    const changed = await cache.current(hashes('b'), build);

    expect([changed, calls()]).toStrictEqual([2, 2]);
  });

  test('concurrent asks share one build', async () => {
    const cache = new HashKeyedCache<number>();
    const { calls, build } = counter();

    const both = await Promise.all([cache.current(hashes('a'), build), cache.current(hashes('a'), build)]);

    expect([...both, calls()]).toStrictEqual([1, 1, 1]);
  });

  test('a failed build is dropped, so the next ask tries again', async () => {
    const cache = new HashKeyedCache<number>();

    const failed = await cache.current(hashes('a'), failing).then(
      () => 'served',
      () => 'refused',
    );
    const recovered = await cache.current(hashes('a'), async () => 7);

    expect([failed, recovered]).toStrictEqual(['refused', 7]);
  });
});
