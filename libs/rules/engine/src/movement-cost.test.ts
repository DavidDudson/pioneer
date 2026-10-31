import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { Predicate } from '@pioneer/rules/sdk';

import { factsUnderForm } from './battle-form';
import { EngineMessage } from './messages';
import type { RuleInPlay } from './rule-in-play';
import { ruleIdOf } from './rule-in-play';
import { flatModifier, inPlay } from './testing';
import { FORM_FACTS, totalOf, valued } from './testing/battle-form-fixtures';

const LAND = 'speed:land';
const FLY = 'speed:fly';
const OWN_SPEED = 25;
const IMMUNE = Predicate.parse(['self:immunity:difficult-terrain']);
const NOT_IMMUNE = Predicate.parse([{ not: 'self:immunity:difficult-terrain' }]);

/** Terrain that costs `extra` feet more per square, from the entry `terrain`, beyond what `body` sets. */
function cost(extra: number, body: object = {}): RuleInPlay {
  return inPlay({ key: 'MovementCost', extra, ...body }, 'terrain');
}

/** Whether `self:immunity:difficult-terrain` is among the facts once `rules` are in play. */
function immuneAfter(...elements: readonly object[]): boolean {
  const rules = elements.map((element) => inPlay(element, 'avatar'));
  const facts = factsUnderForm({ rules, facts: FORM_FACTS });
  return evaluatePredicate(IMMUNE, facts) === Truth.True;
}

describe('movement cost', () => {
  test('without terrain, the Speed is the character’s own', () => {
    expect(totalOf([], LAND)).toBe(OWN_SPEED);
  });

  test('difficult terrain lowers a Speed of 25 to the 10 feet a Stride covers', () => {
    expect(totalOf([cost(5)], LAND)).toBe(10);
  });

  test('greater difficult terrain lowers a Speed of 25 to the 5 feet a Stride covers', () => {
    expect(totalOf([cost(10)], LAND)).toBe(5);
  });

  test('the Speed’s bonuses count before the cost', () => {
    const rules = [cost(5), inPlay(flatModifier('status', 10, [LAND]), 'haste')];

    expect(totalOf(rules, LAND)).toBe(15);
  });

  test('the costliest terrain counts when two reach the Speed', () => {
    expect(totalOf([cost(5), cost(10)], LAND)).toBe(5);
  });

  test('the Speed reports what it was, the cost and the terrain that lowered it', () => {
    const rule = cost(5);

    const speed = valued([rule], LAND);

    expect(speed.movementCost).toMatchObject({ rule: ruleIdOf(rule), extra: 5, was: OWN_SPEED });
    expect(Number(speed.computed)).toBe(10);
  });

  test('a Speed the terrain does not reach is not lowered', () => {
    const fly = valued([cost(5, { movement: ['land'] }), inPlay(flatModifier('status', 30, [FLY]), 'wings')], FLY);

    expect(Number(fly.total)).toBe(30);
    expect(fly.movementCost).toBeUndefined();
  });

  test('a Speed the terrain names is lowered', () => {
    const rules = [cost(5, { movement: ['fly'] }), inPlay(flatModifier('status', 30, [FLY]), 'wings')];

    expect(totalOf(rules, FLY)).toBe(15);
  });

  test('terrain whose predicate fails does not lower the Speed', () => {
    expect(totalOf([cost(5, { predicate: ['form:other'] })], LAND)).toBe(OWN_SPEED);
  });

  test('a Speed of one square covers nothing where a square costs two', () => {
    const speed = valued([cost(5), inPlay(flatModifier('untyped', -20, [LAND]), 'mud')], LAND);

    expect(Number(speed.total)).toBe(0);
    expect(speed.movementCost).toMatchObject({ was: 5 });
  });

  test('the message wording is the engine’s', () => {
    expect(EngineMessage.MovementCostReduces).toBe('engine.movementCost.reduces');
  });
});

describe('immunity facts', () => {
  test('an Immunity element puts self:immunity:<type> among the facts', () => {
    expect(immuneAfter({ key: 'Immunity', type: ['difficult-terrain', 'greater-difficult-terrain'] })).toBe(true);
  });

  test('without the immunity, the fact is absent', () => {
    expect(immuneAfter({ key: 'Immunity', type: ['fire'] })).toBe(false);
  });

  test('an immunity whose predicate fails is not a fact', () => {
    expect(immuneAfter({ key: 'Immunity', type: ['difficult-terrain'], predicate: ['form:other'] })).toBe(false);
  });

  test('terrain predicated on the missing immunity lowers the Speed, and on the immunity it does not', () => {
    const terrain = cost(5, { predicate: NOT_IMMUNE });
    const facts = factsUnderForm({
      rules: [inPlay({ key: 'Immunity', type: ['difficult-terrain'] }, 'avatar')],
      facts: FORM_FACTS,
    });

    expect(evaluatePredicate(NOT_IMMUNE, FORM_FACTS)).toBe(Truth.True);
    expect(evaluatePredicate(NOT_IMMUNE, facts)).toBe(Truth.False);
    expect(totalOf([terrain], LAND)).toBe(10);
  });
});
