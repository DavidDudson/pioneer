import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { ranksInPlay } from './ranks-in-play';
import { inPlay } from './testing';

const proficiency = (selector: string, rank: string, predicate?: readonly unknown[]): object => ({
  key: 'Proficiency',
  selector,
  rank,
  ...(predicate === undefined ? {} : { predicate }),
});

function ranksOf(elements: readonly object[], options: readonly string[] = []): Record<string, string> {
  const rules = elements.map((element, rule) => inPlay(element, 'cleric', { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return Object.fromEntries(ranksInPlay({ rules, facts }));
}

describe('ranksInPlay', () => {
  test('each Proficiency element raises its selector, the highest raise winning in any order', () => {
    const elements = [
      proficiency('save:will', 'expert'),
      proficiency('perception', 'trained'),
      proficiency('save:will', 'master'),
      proficiency('save:will', 'trained'),
    ];

    expect(ranksOf(elements)).toEqual({ 'save:will': 'master', perception: 'trained' });
  });

  test('a raise whose predicate fails or is unknown raises nothing', () => {
    const elements = [
      proficiency('class-dc', 'trained'),
      proficiency('class-dc', 'expert', [{ gte: ['self:level', 9] }]),
      proficiency('perception', 'expert', ['terrain:forest']),
    ];

    expect(ranksOf(elements, ['self:level:1'])).toEqual({ 'class-dc': 'trained' });
  });

  test('other rule elements raise nothing', () => {
    expect(ranksOf([{ key: 'FlatModifier', type: 'item', value: 1, selectors: ['ac'] }])).toEqual({});
  });
});
