import { describe, expect, test } from 'bun:test';

import { Predicate, RollOption, RollOptionNamespace } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { evaluatePredicate } from './evaluate';
import { PredicateFacts } from './facts';
import { Truth } from './truth';

const options = (...given: readonly string[]): RollOption[] => given.map((option) => RollOption.parse(option));
const verdict = (predicate: unknown, given: PredicateFacts): Truth =>
  evaluatePredicate(Predicate.parse(predicate), given);
const ITEM = RollOptionNamespace.parse('item');
const byNumber = (left: number, right: number): number => left - right;

describe('PredicateFacts.withNamespace', () => {
  const character = new PredicateFacts(
    options('self:level:3', 'class:fighter', 'item:trait:rogue', 'item:level:9'),
    CORE_NAMESPACES,
  );

  test('reads the options under the namespace beside the base facts', () => {
    const candidate = character.withNamespace(ITEM, options('trait:fighter', 'level:1'));
    expect(candidate.has('class:fighter')).toBe(true);
    expect(candidate.has('item:trait:fighter')).toBe(true);
    expect(verdict(['item:trait:fighter', { lte: ['item:level', 'self:level'] }], candidate)).toBe(Truth.True);
  });

  test('hides what the base had under the namespace', () => {
    const candidate = character.withNamespace(ITEM, options('trait:fighter', 'level:1'));
    expect(candidate.has('item:trait:rogue')).toBe(false);
    expect(candidate.values(RollOption.parse('item:level')).map(Number)).toEqual([1]);
  });

  test('takes numbers only from options of exactly that prefix', () => {
    const candidate = character.withNamespace(ITEM, options('level:2', 'level:extra:7', 'sublevel:4', 'level:5'));
    expect(candidate.values(RollOption.parse('item:level')).map(Number).toSorted(byNumber)).toEqual([2, 5]);
    expect(candidate.values(RollOption.parse('self:level')).map(Number)).toEqual([3]);
  });

  test('leaves the base unchanged and keeps its namespace table', () => {
    const candidate = character.withNamespace(ITEM, []);
    expect(character.has('item:trait:rogue')).toBe(true);
    expect(verdict(['item:trait:rogue'], candidate)).toBe(Truth.False);
    expect(verdict(['terrain:forest'], candidate)).toBe(Truth.Unknown);
  });
});
