import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, constantFrom, integer, option, property, record } from 'fast-check';

import type { CharacterDocument } from './character-document';
import { featSlots, PrerequisiteStatus } from './feat-slots';
import { slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  featSlotFixtureId,
  skillFixtures,
} from './testing';
import type { FeatSlotFixture } from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const FEATS: readonly FeatSlotFixture[] = [
  'brawn',
  'brutish-shove',
  'keen-eye',
  'knockdown',
  'lunge',
  'power-attack',
  'reactive-shield',
  'sudden-charge',
];
const LEVEL_MAX = 20;
/** A feat, or nothing, for one slot. */
const featPick = option(constantFrom(...FEATS), { nil: undefined });
const picks = record({
  level1: featPick,
  level2: featPick,
  level4: featPick,
  bonus: featPick,
});
const level = integer({ min: 1, max: LEVEL_MAX });
/** Strength from the key attribute, and maybe a free boost too: +1 or +2, either side of Brawn's minimum. */
const strong = constantFrom(false, true);

type Picks = Readonly<Record<keyof typeof FEAT_SLOT_KEYS, FeatSlotFixture | undefined>>;

/** The fixture fighter at `atLevel` with `chosen` in its feat slots, whatever they are. */
function fighterWith(chosen: Picks, atLevel: number, extraStrength: boolean): CharacterDocument {
  let builder = new CharacterBuilder()
    .picking('class', FEAT_SLOT_FIGHTER)
    .picking('boost:1:class:0', 'str')
    .atLevel(atLevel);
  if (extraStrength) {
    builder = builder.picking('boost:1:free:0', 'str');
  }
  for (const [slot, feat] of Object.entries(chosen)) {
    if (feat !== undefined) {
      builder = builder.picking(FEAT_SLOT_KEYS[slot as keyof typeof FEAT_SLOT_KEYS], featSlotFixtureId(feat));
    }
  }
  return builder.build().document;
}

describe('featSlots', () => {
  test('a slot offers no feat above the level it opens at', () => {
    assert(
      property(picks, level, strong, (chosen, atLevel, extraStrength) => {
        for (const slot of featSlots(fighterWith(chosen, atLevel, extraStrength), content)) {
          for (const offered of slot.options) {
            expect(offered.level).toBeLessThanOrEqual(slot.level);
          }
        }
      }),
    );
  });

  test('selectSlot refuses exactly the offered feats whose prerequisites are not met: never an unknown one', () => {
    assert(
      property(picks, level, strong, (chosen, atLevel, extraStrength) => {
        const document = fighterWith(chosen, atLevel, extraStrength);
        for (const slot of featSlots(document, content)) {
          for (const offered of slot.options) {
            const refusal = slotRefusal(document, content, {
              slot: slot.key,
              selection: ChoiceValue.parse(offered.value),
            });
            expect(refusal !== undefined).toBe(offered.status === PrerequisiteStatus.Unmet);
          }
        }
      }),
      // Each refusal reads the character afresh with its slot empty: a few hundred per run.
      { numRuns: 30 },
    );
  });
});
