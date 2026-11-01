import { describe, expect, test } from 'bun:test';

import { inRequestScope, RequestMemo } from './request-memo';

/** A read that counts how often it ran and answers with that count. */
class CountingRead {
  public runs = 0;

  public readonly run = async (): Promise<number> => {
    this.runs += 1;
    return this.runs;
  };
}

describe('RequestMemo', () => {
  test('reads every time outside a scope', async () => {
    const memo = new RequestMemo<string, number>();
    const read = new CountingRead();

    await memo.of('a', read.run);
    await memo.of('a', read.run);

    expect(read.runs).toBe(2);
  });

  test('answers a key once within a scope', async () => {
    const memo = new RequestMemo<string, number>();
    const read = new CountingRead();

    const answers = await inRequestScope(async () => [
      await memo.of('a', read.run),
      await memo.of('a', read.run),
      await memo.of('b', read.run),
    ]);

    expect(answers).toEqual([1, 1, 2]);
  });

  test('shares one read between concurrent callers', async () => {
    const memo = new RequestMemo<string, number>();
    const read = new CountingRead();

    const answers = await inRequestScope(async () =>
      Promise.all([memo.of('a', read.run), memo.of('a', read.run), memo.of('a', read.run)]),
    );

    expect(answers).toEqual([1, 1, 1]);
    expect(read.runs).toBe(1);
  });

  test('reads again in the next scope', async () => {
    const memo = new RequestMemo<string, number>();
    const read = new CountingRead();

    const first = await inRequestScope(async () => memo.of('a', read.run));
    const second = await inRequestScope(async () => memo.of('a', read.run));

    expect([first, second]).toEqual([1, 2]);
  });

  test('keeps an answer of undefined', async () => {
    const memo = new RequestMemo<string, undefined>();
    let runs = 0;
    const read = async (): Promise<undefined> => {
      runs += 1;
      return undefined;
    };

    await inRequestScope(async () => {
      await memo.of('a', read);
      await memo.of('a', read);
    });

    expect(runs).toBe(1);
  });

  test('keeps memos apart', async () => {
    const left = new RequestMemo<string, number>();
    const right = new RequestMemo<string, number>();
    const read = new CountingRead();

    await inRequestScope(async () => {
      await left.of('a', read.run);
      await right.of('a', read.run);
    });

    expect(read.runs).toBe(2);
  });
});
