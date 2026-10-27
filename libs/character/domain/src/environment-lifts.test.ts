import { describe, expect, test } from 'bun:test';

import { Slug } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import type { Character } from './character';
import { withPlay } from './character-with-play';
import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import { characterLiftedRestrictions } from './environment-lifts';
import { slotContent } from './slot-offer';
import { CharacterBuilder, gilledFixtureId, itemFixtureRegistry, underwaterFixtureId } from './testing';

installRulesFakes();

const registry = itemFixtureRegistry();
const sources = { registry, slots: slotContent(registry), variants: [] };
const INSTANCE = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000401');

/** A character underwater, with the gilled condition when `gilled`. */
function underwater(gilled: boolean): Character {
  const built = new CharacterBuilder().build();
  const conditions = gilled
    ? [{ id: INSTANCE, condition: gilledFixtureId(), duration: { kind: ConditionDurationKind.Unlimited } }]
    : [];
  return withPlay(built, { ...built.document.play, environments: [underwaterFixtureId()], conditions });
}

describe('characterLiftedRestrictions', () => {
  test('lifts the restriction a condition the character has names, with the condition as its origin', () => {
    const [lift, ...rest] = characterLiftedRestrictions(underwater(true).document, sources);

    expect(rest).toEqual([]);
    expect(lift?.restriction).toBe(Slug.parse('speech'));
    expect(lift?.origins.map(({ entry }) => entry)).toEqual([gilledFixtureId()]);
  });

  test('lifts nothing for a character with nothing that lifts', () => {
    expect(characterLiftedRestrictions(underwater(false).document, sources)).toEqual([]);
  });
});
