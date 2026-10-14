import { describe, expect, test } from 'bun:test';

import { Predicate } from '@pioneer/rules/sdk';

import { predicateOptions } from './options';

function optionsOf(predicate: unknown): readonly string[] {
  return [...predicateOptions(Predicate.parse(predicate))].toSorted();
}

describe('predicateOptions', () => {
  test('an empty predicate reads nothing', () => {
    expect(optionsOf([])).toStrictEqual([]);
  });

  test('reads the options a predicate names, once, through every compound', () => {
    const predicate = [
      'target:trait:undead',
      { or: ['self:effect:rage', { not: 'action:strike' }, 'target:trait:undead'] },
      // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
      { if: 'terrain:forest', then: { nor: ['lighting:dim'] } },
    ];
    expect(optionsOf(predicate)).toStrictEqual([
      'action:strike',
      'lighting:dim',
      'self:effect:rage',
      'target:trait:undead',
      'terrain:forest',
    ]);
  });

  test('reads the option operands of an order test', () => {
    expect(optionsOf([{ gte: ['self:level', 5] }, { lt: ['target:level', 'self:level'] }])).toStrictEqual([
      'self:level',
      'target:level',
    ]);
  });

  test('eq against a number reads its option; against an option reads none, as the two compare as text', () => {
    expect(optionsOf([{ eq: ['self:rank', 2] }])).toStrictEqual(['self:rank']);
    expect(optionsOf([{ eq: ['self:feat', 'self:other'] }])).toStrictEqual([]);
  });
});
