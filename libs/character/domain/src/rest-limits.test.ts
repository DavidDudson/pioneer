import { describe, expect, test } from 'bun:test';

import {
  Attribute,
  AttributeModifier,
  AttributeModifiers,
  ConditionEffect,
  ConditionTrigger,
  ContentId,
  ContentKind,
  ContentRegistry,
  HitPoints,
  Level,
} from '@pioneer/rules/sdk';
import { automaticEnding, ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { restHealing, restRecovery } from './rest-limits';

function healing(constitution: number, level: number): HitPoints {
  return restHealing({
    attributes: AttributeModifiers.none.with(Attribute.Constitution, AttributeModifier.parse(constitution)),
    level: Level.parse(level),
  });
}

describe('restHealing', () => {
  test('is the Constitution modifier times level', () => {
    expect(healing(3, 5)).toBe(HitPoints.parse(15));
  });

  test.each([0, -1])('heals at least 1 per level at a Constitution modifier of %d', (constitution) => {
    expect(healing(constitution, 4)).toBe(HitPoints.parse(4));
  });
});

describe('restRecovery', () => {
  const pack = new ContentPackBuilder()
    .withCondition('fatigued', [], {
      recovery: [automaticEnding(ConditionTrigger.Rest, { effect: ConditionEffect.Remove })],
    })
    .withCondition('drained', [], {
      valued: true,
      recovery: [automaticEnding(ConditionTrigger.Rest, { effect: ConditionEffect.Lower })],
    })
    .withCondition('blinded');
  const registry = new ContentRegistry();
  registry.register(pack.build());
  const fatigued = ContentId.parse(pack.idOf(ContentKind.Condition, 'fatigued'));
  const drained = ContentId.parse(pack.idOf(ContentKind.Condition, 'drained'));

  test('maps each condition the content eases on Rest to what Rest does to it', () => {
    expect(restRecovery(registry)).toEqual(
      new Map([
        [fatigued, { effect: ConditionEffect.Remove }],
        [drained, { effect: ConditionEffect.Lower }],
      ]),
    );
  });

  test('is empty while the content eases nothing', () => {
    expect(restRecovery(new ContentRegistry()).size).toBe(0);
  });
});
