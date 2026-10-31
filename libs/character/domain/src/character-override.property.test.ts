import { describe, expect, test } from 'bun:test';

import { deriveStatistics, StatisticInputsJson } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, UserId } from '@pioneer/shared/kernel';
import { array, assert, integer, property, uniqueArray } from 'fast-check';

import type { Character } from './character';
import { overrideRules } from './character-override';
import { CharacterPatchField } from './character-patch';
import { OverrideId, OverrideInput } from './override-schema';
import { CharacterBuilder } from './testing';

const ACTOR = UserId.parse('00000000-0000-4000-8000-0000000000a1');
const NOW = fixedClock('2026-02-01T00:00:00Z').now();
const BASE = 10;
const AC = Selector.parse('ac');
const AMOUNT_MAX = 8;
const COUNT_MAX = 8;

const DEFINITION = StatisticDefinition.parse({
  slug: 'statistic:ac',
  name: 'ac',
  selector: 'ac',
  domains: [],
  base: String(BASE),
  kind: StatisticKind.Check,
});
const INPUTS = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const FACTS = new PredicateFacts([], CORE_NAMESPACES);

/** The armour class the engine derives with the character's overrides in play. */
function armourClass(character: Character): number | undefined {
  const rules = overrideRules(character.document);
  const result = deriveStatistics(
    { definitions: [DEFINITION], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    INPUTS,
    { rules, facts: FACTS },
  ).get(AC);
  return result?.ok === true ? Number(result.total) : undefined;
}

/** The id of the nth override, which the test makes up. */
function idOf(index: number): OverrideId {
  return OverrideId.parse(`00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
}

/** A character with an untyped adjust of each amount on armour class, the nth with `idOf(n)`. */
function adjusted(amounts: readonly number[]): Character {
  let character = new CharacterBuilder().build();
  for (const [index, value] of amounts.entries()) {
    const override = OverrideInput.parse({ target: 'ac', mode: 'adjust', value, reason: `Reason ${index}` });
    character = character.apply({ field: CharacterPatchField.AddOverride, override }, NOW, {
      actor: ACTOR,
      newOverrideId: idOf(index),
    });
  }
  return character;
}

function without(character: Character, index: number): Character {
  return character.apply(
    {
      field: CharacterPatchField.RemoveOverride,
      id: idOf(index),
      reason: OverrideInput.shape.reason.parse('Removed'),
    },
    NOW,
    { actor: ACTOR },
  );
}

const AMOUNTS = array(integer({ min: -AMOUNT_MAX, max: AMOUNT_MAX }), { minLength: 1, maxLength: COUNT_MAX });

const SUBSET = uniqueArray(integer({ min: 0, max: COUNT_MAX - 1 }), { minLength: 1 });

describe('removing an override', () => {
  test('restores the total the other overrides give', () => {
    assert(
      property(AMOUNTS, integer({ min: 0, max: COUNT_MAX - 1 }), (amounts, pick) => {
        const index = pick % amounts.length;
        const expected = BASE + amounts.reduce((sum, amount, each) => sum + (each === index ? 0 : amount), 0);

        const removed = without(adjusted(amounts), index);

        expect(armourClass(removed)).toBe(expected);
      }),
    );
  });

  test('restores the un-overridden total once every override is removed', () => {
    assert(
      property(AMOUNTS, (amounts) => {
        let character = adjusted(amounts);
        for (const index of amounts.keys()) {
          character = without(character, index);
        }

        const untouched = armourClass(new CharacterBuilder().build());

        expect(armourClass(character)).toBe(untouched);
        expect(untouched).toBe(BASE);
      }),
    );
  });

  test('is the same whichever order they are removed in', () => {
    assert(
      property(SUBSET, (order) => {
        const everyone = Array.from({ length: COUNT_MAX }, (_unused, index) => index + 1);
        let forward = adjusted(everyone);
        let backward = adjusted(everyone);
        for (const index of order) {
          forward = without(forward, index);
        }
        for (const index of order.toReversed()) {
          backward = without(backward, index);
        }

        expect(armourClass(forward)).toBe(armourClass(backward));
      }),
    );
  });
});
