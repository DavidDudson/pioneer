import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { assert, constantFrom, integer, option, property, record } from 'fast-check';

import { CharacterLevel } from './character-fields';
import { CharacterPatchField } from './character-patch';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { featSlots } from './feat-slots';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  featSlotFixtureId,
  skillFixtures,
} from './testing';

const later = fixedClock('2030-01-01T00:00:00Z').now();
const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LEVEL_MAX = 20;
/** Each run builds and reads a character up to level 20: more outrun a test's timeout on a busy CI runner. */
const RUNS = 30;
const FEATS = ['brawn', 'brutish-shove', 'keen-eye', 'knockdown', 'lunge', 'power-attack'] as const;
const featPick = option(constantFrom(...FEATS), { nil: undefined });
const picks = record({ level1: featPick, level2: featPick, level4: featPick, bonus: featPick });
const level = integer({ min: 1, max: LEVEL_MAX });

describe('changing level', () => {
  test('level down then up restores the effective set, and the picks were never touched', () => {
    assert(
      property(picks, level, level, (chosen, start, lowered) => {
        let builder = new CharacterBuilder()
          .picking('class', FEAT_SLOT_FIGHTER)
          .picking('boost:1:class:0', 'str')
          .atLevel(start);
        for (const [slot, feat] of Object.entries(chosen)) {
          if (feat !== undefined) {
            builder = builder.picking(FEAT_SLOT_KEYS[slot as keyof typeof FEAT_SLOT_KEYS], featSlotFixtureId(feat));
          }
        }
        const original = builder.build();
        const down = original.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(lowered) }, later);
        const restored = down.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(start) }, later);

        expect(down.document.build.choices).toStrictEqual(original.document.build.choices);
        expect(characterSlots(restored.document, content)).toStrictEqual(characterSlots(original.document, content));
        for (const slot of characterSlots(down.document, content)) {
          if (slot.status === SlotStatus.Planned) {
            expect(slot.level).toBeGreaterThan(lowered);
          }
        }
      }),
      { numRuns: RUNS },
    );
  });

  test('planning at a lower level then levelling up equals picking at the level (#492)', () => {
    assert(
      property(picks, level, level, (chosen, planningAt, levelledTo) => {
        const build = (at: number): CharacterBuilder => {
          let builder = new CharacterBuilder()
            .picking('class', FEAT_SLOT_FIGHTER)
            .picking('boost:1:class:0', 'str')
            .atLevel(at);
          for (const [slot, feat] of Object.entries(chosen)) {
            if (feat !== undefined) {
              builder = builder.picking(FEAT_SLOT_KEYS[slot as keyof typeof FEAT_SLOT_KEYS], featSlotFixtureId(feat));
            }
          }
          return builder;
        };
        const planned = build(planningAt)
          .build()
          .apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(levelledTo) }, later);
        const direct = build(levelledTo).build();

        expect(planned.document.build.choices).toStrictEqual(direct.document.build.choices);
        expect(characterSlots(planned.document, content)).toStrictEqual(characterSlots(direct.document, content));
        expect(featSlots(planned.document, content)).toStrictEqual(featSlots(direct.document, content));
      }),
      { numRuns: RUNS },
    );
  });
});
