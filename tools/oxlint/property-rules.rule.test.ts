import { describe, expect, test } from 'bun:test';

import { Linter } from 'eslint';

import { maxPropertyRuns } from './property-rules.ts';

const CAP = 100;

function messagesFor(code: string, options: ReadonlyArray<unknown> = []): ReadonlyArray<string> {
  const linter = new Linter();

  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.js'],
        plugins: { pioneer: { rules: { 'max-property-runs': maxPropertyRuns } } },
        rules: { 'pioneer/max-property-runs': ['error', ...options] },
      },
    ],
    'sample.js',
  );

  return messages.map(({ message }) => message);
}

describe('pioneer/max-property-runs', () => {
  test('allows a cap-sized literal and flags one more', () => {
    expect(messagesFor(`assert(p, { numRuns: ${CAP} });`)).toEqual([]);
    expect(messagesFor(`assert(p, { numRuns: ${CAP + 1} });`)).toHaveLength(1);
  });

  test('flags a named constant, declared before or after its use', () => {
    expect(messagesFor('const RUNS = 500; assert(p, { numRuns: RUNS });')).toHaveLength(1);
    expect(messagesFor('assert(p, { numRuns: RUNS }); const RUNS = 500;')).toHaveLength(1);
  });

  test('allows a run count it cannot resolve', () => {
    expect(messagesFor('assert(p, { numRuns: Number(process.env.RUNS) });')).toEqual([]);
    expect(messagesFor('assert(p, { numRuns: fromEnv });')).toEqual([]);
  });

  test('skips a name declared more than once, as the right value is unclear', () => {
    expect(messagesFor('const RUNS = 500; function f() { const RUNS = 5; } assert(p, { numRuns: RUNS });')).toEqual([]);
  });

  test('uses the cap from its options', () => {
    expect(messagesFor('assert(p, { numRuns: 50 });', [{ max: 25 }])).toHaveLength(1);
    expect(messagesFor('assert(p, { numRuns: 25 });', [{ max: 25 }])).toEqual([]);
  });

  test('names the runs and the cap in its message', () => {
    expect(messagesFor('assert(p, { numRuns: 500 });')).toEqual([
      `numRuns 500 is over the cap of ${CAP}. Make the property cheaper.`,
    ]);
  });
});
