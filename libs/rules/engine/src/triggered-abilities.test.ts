import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  ActionCost,
  ContentId,
  Frequency,
  Predicate,
  RollOption,
  RuleElement,
  TriggerEvent,
  TriggerEventType,
} from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import type { JsonObject } from '@pioneer/rules/sdk/testing';

import { appliesAutomatically, triggeredAbilities } from './triggered-abilities';
import type { TriggerableAbility } from './triggered-abilities';

const factsOf = (...options: readonly string[]): PredicateFacts =>
  new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );

const TEMP_HP = RuleElement.parse({ key: 'TempHP', value: 5 });
const BONUS = RuleElement.parse({ key: 'FlatModifier', selectors: ['ac'], type: 'status', value: 1 });
const PENALTY = RuleElement.parse({ key: 'FlatModifier', selectors: ['ac'], type: 'status', value: -1 });
const FORMULA = RuleElement.parse({ key: 'FlatModifier', selectors: ['ac'], type: 'status', value: '@level' });
const NEUTRAL = RuleElement.parse({ key: 'RollOption', option: 'self:effect:raise-a-shield' });

let counter = 0;

function ability(data: Partial<TriggerableAbility> & { readonly event?: JsonObject } = {}): TriggerableAbility {
  counter += 1;
  const { event, ...rest } = data;

  return {
    id: ContentId.parse(`00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`),
    triggerEvent: TriggerEvent.parse(event ?? { event: TriggerEventType.TurnStart }),
    rules: [TEMP_HP],
    ...rest,
  };
}

describe('triggered abilities', () => {
  test('finds the abilities whose event is the one that fired', () => {
    const start = ability();
    const end = ability({ event: { event: 'turn-end' } });
    const never: TriggerableAbility = { ...ability(), triggerEvent: undefined };

    expect(triggeredAbilities(TriggerEventType.TurnStart, factsOf(), [start, end, never])).toStrictEqual([start]);
  });

  test('a predicate must hold for the roll options of the event', () => {
    const focus = ability({ event: { event: 'cast-spell', predicate: Predicate.parse(['item:trait:focus']) } });
    const any = ability({ event: { event: 'cast-spell' } });

    expect(triggeredAbilities(TriggerEventType.CastSpell, factsOf('item:trait:focus'), [focus, any])).toStrictEqual([
      focus,
      any,
    ]);
    expect(triggeredAbilities(TriggerEventType.CastSpell, factsOf('item:trait:cantrip'), [focus, any])).toStrictEqual([
      any,
    ]);
  });

  test('finds nothing when nothing triggers', () => {
    expect(triggeredAbilities(TriggerEventType.Strike, factsOf(), [])).toStrictEqual([]);
  });
});

describe('applying automatically', () => {
  test.each<readonly [string, Partial<TriggerableAbility>]>([
    ['temporary Hit Points', { rules: [TEMP_HP] }],
    ['a bonus', { rules: [BONUS] }],
    ['temporary Hit Points and a bonus', { rules: [TEMP_HP, BONUS] }],
  ])('applies %s', (_name, data) => {
    expect(appliesAutomatically(ability(data))).toBe(true);
  });

  test.each<readonly [string, Partial<TriggerableAbility>]>([
    ['an action', { cost: ActionCost.One }],
    ['a free action', { cost: ActionCost.Free }],
    ['a reaction', { cost: ActionCost.Reaction }],
    ['a frequency', { frequency: Frequency.parse({ max: 1, per: 'day' }) }],
    ['a resource', { spendsResource: true }],
    ['a choice', { needsChoice: true }],
    ['an opt-out', { autoApply: false }],
    ['a penalty', { rules: [TEMP_HP, PENALTY] }],
    ['a bonus the engine cannot read', { rules: [FORMULA] }],
    ['a rule that is no benefit (a roll option)', { rules: [NEUTRAL] }],
    ['nothing to apply', { rules: [] }],
  ])('does not apply with %s', (_name, data) => {
    expect(appliesAutomatically(ability(data))).toBe(false);
  });
});
