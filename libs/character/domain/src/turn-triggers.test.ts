import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  ActionCost,
  ContentId,
  Frequency,
  HitPoints,
  Predicate,
  RuleElement,
  TriggerEvent,
  TriggerEventType,
} from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { Uuid } from '@pioneer/shared/kernel';

import { ActiveEffectSchema } from './effects';
import type { EffectContent } from './effects';
import { FRESH_PLAY } from './play-state';
import { within } from './testing';
import { autoTriggers, offeredTriggers, triggerSpend, withTriggered } from './turn-triggers';
import type { AutoTrigger, TriggerInputs, TurnTrigger, TurnTriggers } from './turn-triggers';

const ACTION = ContentId.parse('00000000-0000-4000-8000-000000000001');
const EFFECT = ContentId.parse('00000000-0000-4000-8000-000000000002');
const FIVE = HitPoints.parse(5);
const NONE = HitPoints.parse(0);

const trigger = (over: Partial<TurnTrigger> = {}): AutoTrigger => ({
  id: ACTION,
  triggerEvent: TriggerEvent.parse({ event: 'turn-start' }),
  rules: [RuleElement.parse({ key: 'TempHP', value: 5 })],
  tempHp: FIVE,
  ...over,
  effect: EFFECT,
});

const triggers = (...list: readonly TurnTrigger[]): TurnTriggers => ({
  triggers: list,
  facts: new PredicateFacts([], CORE_NAMESPACES),
});

let counter = 0;

const newId = (): Uuid => {
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
    const active = [ActiveEffectSchema.parse({ id: newId(), effect: EFFECT })];

    expect(autoTriggers(TriggerEventType.TurnStart, single, active)).toHaveLength(0);
  });

  test('the spend is free and carries the effect and its temporary Hit Points', () => {
    const request = triggerSpend(trigger(), newId);

    expect(request.cost).toStrictEqual({ kind: 'free' });
    expect(request.apply?.effect).toBe(EFFECT);
    expect(request.apply?.tempHp).toBe(FIVE);
  });

  test('a trigger with no temporary Hit Points leaves them off', () => {
    expect(triggerSpend(trigger({ tempHp: NONE }), newId).apply?.tempHp).toBeUndefined();
  });
});

const EFFECTS: EffectContent = new Map([
  [EFFECT, { remaining: undefined, expiry: undefined, sustained: false, badge: undefined }],
]);

const RUN = (...list: readonly TurnTrigger[]): TriggerInputs => ({
  limits: { ...within(HitPoints.parse(30)), effects: EFFECTS },
  triggered: () => triggers(...list),
  newId,
});

describe('withTriggered', () => {
  test('puts the effect and its temporary Hit Points on the character, logs the spend and says so', () => {
    const { play, events } = withTriggered(
      { play: FRESH_PLAY, events: [] },
      TriggerEventType.TurnStart,
      RUN(trigger()),
    );

    expect(play.effects.map(({ effect }) => effect)).toStrictEqual([EFFECT]);
    expect(play.hp.temp).toBe(FIVE);
    expect(play.spendLog).toHaveLength(1);
    expect(events.map(({ kind }) => kind)).toStrictEqual(['triggeredAbility']);
  });

  test('does nothing for an event nothing fires on', () => {
    const outcome = withTriggered({ play: FRESH_PLAY, events: [] }, TriggerEventType.TurnEnd, RUN(trigger()));

    expect(outcome.play).toBe(FRESH_PLAY);
    expect(outcome.events).toStrictEqual([]);
  });

  test('two triggers of one effect put it on once', () => {
    const other = ContentId.parse('00000000-0000-4000-8000-000000000003');
    const second = trigger({ id: other });

    const { play, events } = withTriggered(
      { play: FRESH_PLAY, events: [] },
      TriggerEventType.TurnStart,
      RUN(trigger(), second),
    );

    expect(play.effects).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});

const REACTION_SPENT = { ...FRESH_PLAY, turn: { ...FRESH_PLAY.turn, reactionUsed: true } };

describe('offered triggers', () => {
  const costly = trigger({ cost: ActionCost.Free, frequency: Frequency.parse({ max: 1, per: 'day' }) });

  test('one that costs something is offered, not applied', () => {
    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(costly), FRESH_PLAY)).toStrictEqual([costly]);
    expect(autoTriggers(TriggerEventType.TurnStart, triggers(costly), [])).toStrictEqual([]);
  });

  test('one that applies by itself is not offered', () => {
    const automatic = triggers(trigger());

    expect(offeredTriggers(TriggerEventType.TurnStart, automatic, FRESH_PLAY)).toStrictEqual([]);
  });

  test('one that needs a choice is offered', () => {
    const choosy = trigger({ needsChoice: true, cost: ActionCost.Free });

    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(choosy), FRESH_PLAY)).toStrictEqual([choosy]);
  });

  test('one with requirements is offered', () => {
    const needy = trigger({ requirements: Predicate.parse(['self:effect:rage']), cost: ActionCost.One });

    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(needy), FRESH_PLAY)).toStrictEqual([needy]);
  });

  test('one with no cost has no way to be used, so it is not offered', () => {
    const free = trigger({ requirements: Predicate.parse(['self:effect:rage']) });

    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(free), FRESH_PLAY)).toStrictEqual([]);
  });

  test('at End turn only a reaction is offered: no actions are left to spend', () => {
    const ending = TriggerEvent.parse({ event: 'turn-end' });
    const action = trigger({ cost: ActionCost.One, triggerEvent: ending });
    const reaction = trigger({ cost: ActionCost.Reaction, triggerEvent: ending });

    expect(offeredTriggers(TriggerEventType.TurnEnd, triggers(action), FRESH_PLAY)).toStrictEqual([]);
    expect(offeredTriggers(TriggerEventType.TurnEnd, triggers(reaction), FRESH_PLAY)).toStrictEqual([reaction]);
  });

  test('a reaction is offered only while the reaction is unspent', () => {
    const reaction = trigger({ cost: ActionCost.Reaction });

    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(reaction), FRESH_PLAY)).toStrictEqual([reaction]);
    expect(offeredTriggers(TriggerEventType.TurnStart, triggers(reaction), REACTION_SPENT)).toStrictEqual([]);
  });

  test('an ability granted twice is offered once, with the others of its event together', () => {
    const other = trigger({ id: ContentId.parse('00000000-0000-4000-8000-000000000004'), cost: ActionCost.One });
    const offered = offeredTriggers(TriggerEventType.TurnStart, triggers(costly, costly, other), FRESH_PLAY);

    expect(offered.map(({ id }) => id)).toStrictEqual([ACTION, other.id]);
  });

  test('applying a turn boundary says which abilities are offered', () => {
    const { events } = withTriggered({ play: FRESH_PLAY, events: [] }, TriggerEventType.TurnStart, RUN(costly));

    expect(events.map(({ kind }) => kind)).toStrictEqual(['triggerOffered']);
  });
});
