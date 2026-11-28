import { describe, expect, test } from 'bun:test';

import { AttributeModifier } from '@pioneer/rules/sdk';

import { BoostKind, modifierOf } from './boost-modifier';

const { Regular, Apex } = BoostKind;

/** What one attribute's boosts add up to: whether it is flawed, the boosts in level order, and the modifier. */
const ROWS: ReadonlyArray<readonly [string, boolean, ReadonlyArray<BoostKind>, number]> = [
  ['no boosts', false, [], 0],
  ['a flaw', true, [], -1],
  ['apex lifts a low modifier to +4', false, [Apex], 4],
  ['apex lifts a flawed one to +4', true, [Apex], 4],
  ['apex on +3 gives +4', false, [Regular, Regular, Regular, Apex], 4],
  ['apex on +4 gives +5', false, [Regular, Regular, Regular, Regular, Apex], 5],
  ['apex drops a pending partial boost', false, [Regular, Regular, Regular, Regular, Regular, Apex], 5],
  ['apex on +5 gives +6', false, [Regular, Regular, Regular, Regular, Regular, Regular, Regular, Apex], 6],
  ['a partial boost after apex', false, [Apex, Regular], 4],
  ['two partial boosts after apex', false, [Apex, Regular, Regular], 5],
];

describe('modifierOf', () => {
  test.each(ROWS)('%s', (_name, flawed, ...rest) => {
    const [boosts, expected] = rest;

    expect(modifierOf(flawed, boosts)).toBe(AttributeModifier.parse(expected));
  });
});
