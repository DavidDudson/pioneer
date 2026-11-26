import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionCost, ContentId, HitPoints, RuleElement, TriggerEvent, TriggerEventType } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { Uuid } from '@pioneer/shared/kernel';

import { ActiveEffectSchema } from './effects';
import { autoTriggers, triggerSpend } from './turn-triggers';
import type { TurnTrigger, TurnTriggers } from './turn-triggers';

const ACTION = ContentId.parse('00000000-0000-4000-8000-000000000001');
const EFFECT = ContentId.parse('00000000-0000-4000-8000-000000000002');
const FIVE = HitPoints.parse(5);
const NONE = HitPoints.parse(0);

const trigger = (over: Partial<TurnTrigger> = {}): TurnTrigger => ({
  id: ACTION,
  triggerEvent: TriggerEvent.parse({ event: 'turn-start' }),
  rules: [RuleElement.parse({ key: 'TempHP', value: 5 })],
  effect: EFFECT,
  tempHp: FIVE,
  ...over,
});

const triggers = (...list: readonly TurnTrigger[]): TurnTriggers => ({
  triggers: list,
  facts: new PredicateFacts([], CORE_NAMESPACES),
});

let counter = 0;

const ids = (): Uuid => {
  counter += 1;

  return Uuid.parse(`00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`);
};

describe('turn triggers', () => {
  test('a free, beneficial trigger applies when its event fires', () => {
    const single = triggers(trigger());

    expect(autoTriggers(TriggerEventType.TurnStart, single, [])).toHaveLength(1);
    expect(autoTriggers(TriggerEventType.TurnEnd, single, [])).toHaveLength(0);
  });

  test('one with a cost is left to the player', () => {
    const costly = triggers(trigger({ cost: ActionCost.One }));

    expect(autoTriggers(TriggerEventType.TurnStart, costly, [])).toHaveLength(0);
  });

  test('is not applied again while its effect is on the character', () => {
    const single = triggers(trigger());
    const active = [ActiveEffectSchema.parse({ id: ids(), effect: EFFECT })];

    expect(autoTriggers(TriggerEventType.TurnStart, single, active)).toHaveLength(0);
  });

  test('the spend is free and carries the effect and its temporary Hit Points', () => {
    const request = triggerSpend(trigger(), ids);

    expect(request.cost).toStrictEqual({ kind: 'free' });
    expect(request.apply?.effect).toBe(EFFECT);
    expect(request.apply?.tempHp).toBe(FIVE);
  });

  test('a trigger with no temporary Hit Points leaves them off', () => {
    expect(triggerSpend(trigger({ tempHp: NONE }), ids).apply?.tempHp).toBeUndefined();
  });
});
