import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionCost, ContentId, HitPoints, RuleElement, TriggerEvent, TriggerEventType } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { Uuid } from '@pioneer/shared/kernel';

import { ActiveEffectSchema } from './effects';
import type { EffectContent } from './effects';
import { FRESH_PLAY } from './play-state';
import { within } from './testing';
import { TurnPhase } from './turn-state';
import type { TurnState } from './turn-state';
import { autoTriggers, promptedAbilities, triggerSpend, withPrompted, withTriggered } from './turn-triggers';
import type { TriggerInputs, TurnOffer, TurnTrigger, TurnTriggers } from './turn-triggers';

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

const FACTS = new PredicateFacts([], CORE_NAMESPACES);

const triggers = (...list: ReadonlyArray<TurnTrigger>): TurnTriggers => ({ triggers: list, offers: [], facts: FACTS });

const offered = (...offers: ReadonlyArray<TurnOffer>): TurnTriggers => ({ triggers: [], offers, facts: FACTS });

const OTHER = ContentId.parse('00000000-0000-4000-8000-000000000003');

const offer = (over: Partial<TurnOffer> = {}): TurnOffer => ({
  id: ACTION,
  triggerEvent: TriggerEvent.parse({ event: 'turn-start' }),
  rules: [],
  byItself: false,
  ...over,
});

const turn = (over: Partial<TurnState> = {}): TurnState => ({ ...FRESH_PLAY.turn, phase: TurnPhase.Turn, ...over });

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

const RUN = (...list: ReadonlyArray<TurnTrigger>): TriggerInputs => ({
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

describe('promptedAbilities', () => {
  test('lists an ability with a cost that fires on the event', () => {
    const list = offered(offer({ cost: ActionCost.Reaction }));

    expect(promptedAbilities(TriggerEventType.TurnStart, list, turn())).toStrictEqual([ACTION]);
    expect(promptedAbilities(TriggerEventType.TurnEnd, list, turn())).toStrictEqual([]);
  });

  test('leaves out one that applies by itself', () => {
    const list = offered(offer({ byItself: true }));

    expect(promptedAbilities(TriggerEventType.TurnStart, list, turn())).toStrictEqual([]);
  });

  test('lists several abilities of one event together', () => {
    const list = offered(offer({ cost: ActionCost.One }), offer({ id: OTHER, cost: ActionCost.Reaction }));

    expect(promptedAbilities(TriggerEventType.TurnStart, list, turn())).toStrictEqual([ACTION, OTHER]);
  });

  test('offers a reaction only while the reaction is unspent', () => {
    const list = offered(offer({ cost: ActionCost.Reaction }));

    expect(promptedAbilities(TriggerEventType.TurnStart, list, turn({ reactionUsed: true }))).toStrictEqual([]);
  });

  test('off-turn offers a reaction and a free action, and no action', () => {
    const off = turn({ phase: TurnPhase.OffTurn });

    const list = offered(
      offer({ id: ACTION, cost: ActionCost.Reaction }),
      offer({ id: OTHER, cost: ActionCost.Free }),
      offer({ id: EFFECT, cost: ActionCost.Two }),
    );

    expect(promptedAbilities(TriggerEventType.TurnStart, list, off)).toStrictEqual([ACTION, OTHER]);
    expect(
      promptedAbilities(TriggerEventType.TurnStart, list, turn({ phase: TurnPhase.OffTurn, reactionUsed: true })),
    ).toStrictEqual([OTHER]);
  });
});

describe('withPrompted', () => {
  test('adds one prompt event naming every ability', () => {
    const inputs: TriggerInputs = {
      ...RUN(),
      triggered: () => offered(offer({ cost: ActionCost.One }), offer({ id: OTHER, cost: ActionCost.Reaction })),
    };

    const { events } = withPrompted(
      { play: { ...FRESH_PLAY, turn: turn() }, events: [] },
      TriggerEventType.TurnStart,
      inputs,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'triggerPrompt', event: 'turn-start', abilities: [ACTION, OTHER] });
  });

  test('adds nothing when nothing is left to the player', () => {
    const outcome = { play: FRESH_PLAY, events: [] };

    expect(withPrompted(outcome, TriggerEventType.TurnStart, RUN())).toBe(outcome);
  });
});
