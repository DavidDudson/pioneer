import { describe, expect, test } from 'bun:test';

import { Predicate, RollOption } from '@pioneer/rules/sdk';

import { evaluatePredicate } from './evaluate';
import { PredicateFacts } from './facts';
import { Truth } from './truth';

const options = (...given: readonly string[]): RollOption[] => given.map((option) => RollOption.parse(option));
const verdict = (predicate: unknown, given: PredicateFacts): Truth =>
  evaluatePredicate(Predicate.parse(predicate), given);

describe('PredicateFacts.with', () => {
  const character = new PredicateFacts(options('self:level:3', 'class:fighter'));

  test('sees both its own options and the base', () => {
    const extended = character.with(options('item:trait:fighter', 'item:level:1'));
    expect(extended.has('class:fighter')).toBe(true);
    expect(extended.has('item:trait:fighter')).toBe(true);
    expect(verdict(['item:trait:fighter', { lte: ['item:level', 'self:level'] }], extended)).toBe(Truth.True);
  });

  test('leaves the base unchanged', () => {
    character.with(options('item:trait:fighter'));
    expect(character.has('item:trait:fighter')).toBe(false);
  });

  test('joins the numbers under one prefix from both', () => {
    const extended = character.with(options('self:level:5'));
    expect(extended.values(RollOption.parse('self:level')).map(Number).toSorted((left, right) => left - right)).toEqual([3, 5]);
    expect(extended.values(RollOption.parse('item:level'))).toEqual([]);
  });

  test('keeps the base namespaces, so a missing known option is false', () => {
    expect(verdict(['item:trait:rogue'], character.with([]))).toBe(Truth.False);
    expect(verdict(['terrain:forest'], character.with([]))).toBe(Truth.Unknown);
  });
});
