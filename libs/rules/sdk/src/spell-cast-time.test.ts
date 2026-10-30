import { describe, expect, test } from 'bun:test';

import { CastTime } from './spell-casting';

const actions = { type: 'actions', cost: 'two' };
const rounds = { type: 'time', count: 2, unit: 'round' };

function accepted(time: object): boolean {
  return CastTime.safeParse(time).success;
}

describe('CastTime', () => {
  test('offers actions or time to pick from', () => {
    expect(accepted({ type: 'either', options: [actions, rounds] })).toBe(true);
  });

  test.each([
    ['one option', [actions]],
    ['three options', [actions, rounds, actions]],
    ['a nested choice', [actions, { type: 'either', options: [actions, rounds] }]],
  ])('rejects %s', (_name, options) => {
    expect(accepted({ type: 'either', options })).toBe(false);
  });
});
