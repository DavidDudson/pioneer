import { describe, expect, test } from 'bun:test';

import { assert, integer, property } from 'fast-check';

import { feetToMetres } from './units';

const squares = integer({ min: 0, max: 400 });

function squareIsOnePointFive(count: number): void {
  expect(feetToMetres(count * 5)).toBeCloseTo(count * 1.5, 10);
}

function adds(left: number, right: number): void {
  expect(feetToMetres((left + right) * 5)).toBeCloseTo(feetToMetres(left * 5) + feetToMetres(right * 5), 10);
}

function grows(feet: number): void {
  expect(feetToMetres(feet + 1)).toBeGreaterThanOrEqual(feetToMetres(feet));
}

describe('feetToMetres (properties)', () => {
  test('every 5 ft square is exactly 1.5 m', () => {
    assert(property(squares, squareIsOnePointFive));
  });

  test('whole squares add up', () => {
    assert(property(squares, squares, adds));
  });

  test('never shrinks as distance grows', () => {
    assert(property(integer({ min: 0, max: 2000 }), grows));
  });
});

describe('feetToMetres', () => {
  test('converts common PF2e distances', () => {
    expect(feetToMetres(25)).toBe(7.5);
    expect(feetToMetres(30)).toBe(9);
    expect(feetToMetres(120)).toBe(36);
    expect(feetToMetres(0)).toBe(0);
  });
});
