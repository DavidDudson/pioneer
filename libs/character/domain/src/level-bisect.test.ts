import { describe, expect, test } from 'bun:test';

import { Level } from '@pioneer/rules/sdk';
import { array, assert, integer, property, shuffledSubarray } from 'fast-check';

import { bisected } from './level-bisect';

const FIRST = Level.parse(1);
const LAST = Level.parse(20);
const RANGE = { first: FIRST, last: LAST };

/** A value that grows at the given levels: how many of `steps` are at or below the level. */
function stepsAt(steps: readonly number[]): (level: Level) => number {
  return (level) => steps.filter((step) => step <= level).length;
}

describe('bisected', () => {
  test('reads a few levels of a value that grows at two, and gets every level right', () => {
    const reads: number[] = [];
    const exact = stepsAt([7, 13]);
    const read = bisected(
      (level) => {
        reads.push(level);
        return exact(level);
      },
      (left, right) => left === right,
      RANGE,
    );
    for (let level = 1; level <= 20; level += 1) {
      expect(read(Level.parse(level))).toBe(exact(Level.parse(level)));
    }
    expect(new Set(reads).size).toBeLessThan(12);
    expect(reads.length).toBe(new Set(reads).size);
  });

  test('reads only the two ends of a value that never changes', () => {
    const reads: number[] = [];
    const read = bisected(
      (level) => {
        reads.push(level);
        return 'same';
      },
      (left, right) => left === right,
      RANGE,
    );
    for (let level = 1; level <= 20; level += 1) {
      read(Level.parse(level));
    }
    expect(reads.toSorted((left, right) => left - right)).toEqual([1, 20]);
  });

  test('gives every level the value reading it alone gives, for any steps and any order of asking', () => {
    const stepLevels = array(integer({ min: 1, max: 20 }), { maxLength: 20 });
    const allLevels = Array.from({ length: 20 }, (_unused, index) => index + 1);
    assert(
      property(stepLevels, shuffledSubarray(allLevels), (steps, order) => {
        const exact = stepsAt(steps);
        const read = bisected(exact, (left, right) => left === right, RANGE);
        for (const level of order) {
          expect(read(Level.parse(level))).toBe(exact(Level.parse(level)));
        }
      }),
    );
  });
});
