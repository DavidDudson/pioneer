import { describe, expect, test } from 'bun:test';

import { NUMBER_CONSTANT, propertyRuns, RUNS_PROPERTY } from './property-rules.ts';
import type { RunsProperty } from './property-rules.ts';

const NO_CONSTANTS: ReadonlyMap<string, number> = new Map();
const KEY = { type: 'Identifier', name: 'numRuns' } as const;

describe('propertyRuns', () => {
  test('reads a numeric literal', () => {
    const property: RunsProperty = { key: KEY, value: { type: 'Literal', value: 200 } };

    expect(propertyRuns(property, NO_CONSTANTS)).toBe(200);
  });

  test('resolves a const in the same file', () => {
    const property: RunsProperty = { key: KEY, value: { type: 'Identifier', name: 'RUNS' } };

    expect(propertyRuns(property, new Map([['RUNS', 150]]))).toBe(150);
  });

  test('ignores a name it cannot resolve, such as an env var for the nightly sweep', () => {
    const property: RunsProperty = { key: KEY, value: { type: 'Identifier', name: 'NIGHTLY_RUNS' } };

    expect(propertyRuns(property, NO_CONSTANTS)).toBeUndefined();
  });
});

describe('RUNS_PROPERTY', () => {
  test('accepts numRuns set to a number', () => {
    const node = { type: 'Property', key: KEY, value: { type: 'Literal', value: 25 } };

    expect(RUNS_PROPERTY.safeParse(node).success).toBe(true);
  });

  test('ignores other keys', () => {
    const node = { key: { type: 'Identifier', name: 'seed' }, value: { type: 'Literal', value: 500 } };

    expect(RUNS_PROPERTY.safeParse(node).success).toBe(false);
  });

  test('ignores a call expression', () => {
    const node = { key: KEY, value: { type: 'CallExpression' } };

    expect(RUNS_PROPERTY.safeParse(node).success).toBe(false);
  });

  test('ignores a non-numeric literal', () => {
    const node = { key: KEY, value: { type: 'Literal', value: '500' } };

    expect(RUNS_PROPERTY.safeParse(node).success).toBe(false);
  });
});

describe('NUMBER_CONSTANT', () => {
  test('accepts a const set to a number', () => {
    const declarator = { id: { type: 'Identifier', name: 'RUNS' }, init: { type: 'Literal', value: 30 } };

    expect(NUMBER_CONSTANT.safeParse(declarator).success).toBe(true);
  });

  test('ignores a const set to something else', () => {
    const declarator = { id: { type: 'Identifier', name: 'RUNS' }, init: { type: 'CallExpression' } };

    expect(NUMBER_CONSTANT.safeParse(declarator).success).toBe(false);
  });
});
