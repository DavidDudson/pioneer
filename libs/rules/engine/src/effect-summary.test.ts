import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  ContentId,
  contentId,
  ContentKind,
  entrySlug,
  PackId,
  RollOption,
  Selector,
  Slug,
  SpellRank,
} from '@pioneer/rules/sdk';
import type { RuleElements } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { EffectChange, EffectMode, EffectStatusKind } from './effect-line';
import type { EffectLine } from './effect-line';
import { summariseEffects } from './effect-summary';
import type { EffectScope, SummarisedEntry } from './effect-summary';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { change, flatModifier, inPlay, statistic } from './testing';

const DARKVISION = ContentId.parse('67979b6a-4b24-5be5-b7ea-94783c497bcb');
const IN_FOREST = RollOption.parse('terrain:forest');
const RAISED = RollOption.parse('self:effect:raise-a-shield');

const perception = statistic('perception', '10');
const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

/** The id `inPlay` gives the entry named `name`. */
function idOf(name: string): ContentId {
  const slug = entrySlug(ContentKind.Effect, Slug.parse(name));
  return ContentId.parse(contentId(PackId.parse('engine-test'), slug));
}

function entryOf(name: string, elements: readonly object[]): SummarisedEntry {
  const [first] = elements.map((element, rule) => inPlay(element, name, { rule }));
  return {
    id: idOf(name),
    rules: elements as unknown as RuleElements,
    sources: first?.origin.sources ?? [],
  };
}

/** The rules of the entries named, each element placed in order. */
function placed(...entries: readonly (readonly [string, readonly object[]])[]): RuleInPlay[] {
  return entries.flatMap(([name, elements]) => elements.map((element, rule) => inPlay(element, name, { rule })));
}

function scopeOf(rules: readonly RuleInPlay[]): EffectScope {
  const facts = new PredicateFacts([], CORE_NAMESPACES);
  return {
    content: { definitions: [perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    modifiers: { rules, facts },
  };
}

function summary(
  [name, elements]: readonly [string, readonly object[]],
  others: readonly (readonly [string, readonly object[]])[],
  mode: EffectMode,
): readonly EffectLine[] {
  return summariseEffects(scopeOf(placed(...others)), entryOf(name, elements), mode);
}

describe('summariseEffects', () => {
  test('a bonus is a line with its statistic, type, value and that it applies', () => {
    const element = flatModifier('item', 1, ['perception']);
    const lines = summary(['lens', [element]], [['lens', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([
      {
        change: EffectChange.Bonus,
        selector: Selector.parse('perception'),
        type: 'item',
        value: 1,
        status: { kind: EffectStatusKind.Applied },
      },
    ]);
  });

  test('a negative value is a penalty', () => {
    const element = flatModifier('status', -2, ['perception']);
    const lines = summary(['dazzle', [element]], [['dazzle', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([{ change: EffectChange.Penalty, type: 'status', value: -2 }]);
  });

  test('a bonus a better one of its type beats is suppressed by it', () => {
    const weak = flatModifier('item', 1, ['perception']);
    const strong = flatModifier('item', 2, ['perception']);
    const lines = summary(
      ['weak', [weak]],
      [
        ['weak', [weak]],
        ['strong', [strong]],
      ],
      EffectMode.Applying,
    );
    expect(lines).toMatchObject([
      {
        change: EffectChange.Bonus,
        status: { kind: EffectStatusKind.Suppressed, by: ruleIdOf(inPlay(strong, 'strong')) },
      },
    ]);
  });

  test('a bonus whose predicate depends on the situation is conditional', () => {
    const element = { ...flatModifier('circumstance', 1, ['perception']), predicate: [IN_FOREST] };
    const lines = summary(['stance', [element]], [['stance', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([{ change: EffectChange.Bonus, status: { kind: EffectStatusKind.Conditional } }]);
  });

  test('a bonus whose predicate fails is inactive', () => {
    const element = { ...flatModifier('circumstance', 1, ['perception']), predicate: [RAISED] };
    const lines = summary(['stance', [element]], [['stance', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([{ change: EffectChange.Bonus, status: { kind: EffectStatusKind.Inactive } }]);
  });

  test('a Change is a set line with the value it replaced and the one it left', () => {
    const element = change('perception', 'override', 30);
    const lines = summary(['oracle', [element]], [['oracle', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([{ change: EffectChange.Set, mode: 'override', value: 30, replaced: 10, result: 30 }]);
  });

  test('a resistance, a weakness and an immunity are lines of their own', () => {
    const elements = [
      { key: 'Resistance', type: ['fire'], value: 5 },
      { key: 'Weakness', type: ['cold'], value: 3 },
      { key: 'Immunity', type: ['poison'] },
    ];
    const lines = summary(['hide', elements], [['hide', elements]], EffectMode.Applying);
    expect(lines).toMatchObject([
      { change: EffectChange.Resistance, damage: 'fire', value: 5 },
      { change: EffectChange.Weakness, damage: 'cold', value: 3 },
      { change: EffectChange.Immunity, immunity: 'poison' },
    ]);
  });

  test('a Sense is a line with its acuity, and precise when the element says none', () => {
    const element = { key: 'Sense', sense: DARKVISION };
    const lines = summary(['eyes', [element]], [['eyes', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([
      { change: EffectChange.Sense, sense: DARKVISION, acuity: 'precise', status: { kind: EffectStatusKind.Applied } },
    ]);
  });

  test('a rule element the summary does not cover is said so', () => {
    const element = { key: 'RollOption', option: 'self:watching' };
    const lines = summary(['guard', [element]], [['guard', [element]]], EffectMode.Applying);
    expect(lines).toMatchObject([{ change: EffectChange.NotSummarised, element: 'RollOption' }]);
  });

  test('applying has no lines for an entry that is not in play', () => {
    const element = flatModifier('item', 1, ['perception']);
    expect(summary(['lens', [element]], [], EffectMode.Applying)).toStrictEqual([]);
  });

  test('would-apply shows the lines an entry not in play would give', () => {
    const element = flatModifier('item', 1, ['perception']);
    const lines = summary(['lens', [element]], [], EffectMode.WouldApply);
    expect(lines).toMatchObject([{ change: EffectChange.Bonus, value: 1, status: { kind: EffectStatusKind.Applied } }]);
  });

  test('would-apply shows a bonus suppressed when a better one is already in play', () => {
    const weak = flatModifier('item', 1, ['perception']);
    const strong = flatModifier('item', 2, ['perception']);
    const lines = summary(['weak', [weak]], [['strong', [strong]]], EffectMode.WouldApply);
    expect(lines).toMatchObject([{ status: { kind: EffectStatusKind.Suppressed } }]);
  });

  test('would-apply for an entry already in play equals applying', () => {
    const elements = [flatModifier('item', 1, ['perception']), { key: 'Resistance', type: ['fire'], value: 5 }];
    const others = [['lens', elements]] as const;
    expect(summary(['lens', elements], others, EffectMode.WouldApply)).toStrictEqual(
      summary(['lens', elements], others, EffectMode.Applying),
    );
  });

  test.each([
    [3, 1],
    [5, 2],
    [7, 3],
  ])('a spell cast at rank %i reads @item.level as that rank when it would apply', (rank, expected) => {
    const element = flatModifier('status', 'floor(@item.level / 2)', ['perception']);
    const entry = { ...entryOf('heroism', [element]), rank: SpellRank.parse(rank) };
    const lines = summariseEffects(scopeOf([]), entry, EffectMode.WouldApply);
    expect(lines).toMatchObject([{ change: EffectChange.Bonus, value: expected }]);
  });
});
