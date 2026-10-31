import { describe, expect, test } from 'bun:test';

import { NamespaceKind, Predicate, RollOption, RollOptionNamespace } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { evaluatePredicate } from './evaluate';
import { PredicateFacts } from './facts';
import { namespaceTable } from './namespaces';
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

describe('PredicateFacts.minus', () => {
  const character = new PredicateFacts(options('self:level:3', 'specialty:alchemy', 'item:level:9'), CORE_NAMESPACES);

  test('drops the option and leaves the facts it came from', () => {
    const without = character.minus(RollOption.parse('specialty:alchemy'));
    expect(without.has('specialty:alchemy')).toBe(false);
    expect(without.has('self:level:3')).toBe(true);
    expect(character.has('specialty:alchemy')).toBe(true);
  });

  test('drops it beneath a namespace layer too', () => {
    const candidate = character.withNamespace(ITEM, options('level:1')).minus(RollOption.parse('specialty:alchemy'));
    expect(candidate.has('specialty:alchemy')).toBe(false);
    expect(candidate.has('item:level:1')).toBe(true);
  });
});

describe('PredicateFacts.withRanksUnread', () => {
  const known = namespaceTable({ skill: NamespaceKind.Known });
  const character = new PredicateFacts(options('self:level:3', 'skill:arcana:rank:1'), known);

  test('reads a missing skill rank as unknown, where it is otherwise false', () => {
    expect(verdict(['skill:acrobatics:rank:0'], character)).toBe(Truth.False);
    expect(verdict(['skill:acrobatics:rank:0'], character.withRanksUnread())).toBe(Truth.Unknown);
  });

  test('keeps a rank that is present, and other known options false', () => {
    const unread = character.withRanksUnread();
    expect(verdict(['skill:arcana:rank:1'], unread)).toBe(Truth.True);
    expect(verdict(['skill:arcana'], unread)).toBe(Truth.False);
  });

  test('holds through a namespace layer, plus and minus', () => {
    const layered = character.withRanksUnread().withNamespace(ITEM, []).plus(options('x:y'));
    expect(verdict(['skill:acrobatics:rank:0'], layered)).toBe(Truth.Unknown);
    const without = character.withRanksUnread().minus(RollOption.parse('self:level:3'));
    expect(verdict(['skill:acrobatics:rank:0'], without)).toBe(Truth.Unknown);
  });
});
