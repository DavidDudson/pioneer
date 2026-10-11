import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Rarity, SlotRank } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, constantFrom, integer, property, subarray } from 'fast-check';

import { preparedSlots } from './prepared-spells';
import { preparedReads, slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  PLAYER_CORE_CLASSES,
  playerCoreClasses,
  playerCoreClassId,
  spellFixtureId,
  spellFixtures,
} from './testing';
import type { SpellFixture } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const UNCOMMON: readonly SpellFixture[] = ['veil-of-privacy', 'wish', 'ring-of-truth'];

const caster = {
  name: constantFrom(...PLAYER_CORE_CLASSES),
  level: integer({ min: 1, max: 20 }),
  access: subarray([...UNCOMMON]),
};

describe('preparedSlots (properties)', () => {
  test('every spell a slot offers fits it, and selectSlot takes it', () => {
    assert(
      property(caster.name, caster.level, caster.access, (name, level, access) => {
        const built = new CharacterBuilder()
          .picking('class', playerCoreClassId(name))
          .picking('boost:1:class:0', 'str')
          .atLevel(level)
          .build().document;
        const document = {
          ...built,
          build: { ...built.build, spellAccess: access.map((spell) => spellFixtureId(spell)) },
        };
        for (const slot of preparedSlots(document, preparedReads(document, content))) {
          for (const spell of slot.options) {
            expect(spell.traditions).toContain(slot.tradition);
            expect(spell.cantrip).toBe(slot.rank === SlotRank.Cantrip);
            if (slot.rank !== SlotRank.Cantrip) {
              expect(spell.rank).toBeLessThanOrEqual(slot.rank);
            }
            if (spell.rarity !== Rarity.Common) {
              expect(document.build.spellAccess).toContain(spell.id);
            }
            expect(slotRefusal(document, content, { slot: slot.key, selection: spell.id })).toBeUndefined();
          }
        }
      }),
    );
  });
});
