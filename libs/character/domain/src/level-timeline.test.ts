import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Level } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';

import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { levelTimeline } from './level-timeline';
import type { TimelineRow } from './level-timeline';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  featSlotFixtureId,
  skillFixtures,
} from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LEVEL_MAX = 20;
const THIRD = 3;
const FOURTH = 4;
const EIGHTH = 8;

function fighter(level: number): CharacterBuilder {
  return new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(level);
}

/** The level whose row holds `key`, or undefined when no row does. */
function rowOf(rows: readonly TimelineRow[], key: string): number | undefined {
  return rows.find((row) => row.slots.some((slot) => slot.key === key))?.level;
}

describe('level timeline', () => {
  test('has one row for each level from 1 to 20', () => {
    const rows = levelTimeline(fighter(THIRD).build().document, content);
    expect(rows.map((row) => row.level)).toStrictEqual(
      Array.from({ length: LEVEL_MAX }, (_unused, index) => Level.parse(index + 1)),
    );
  });

  test('puts each slot at the level it opens, above the character’s as planned', () => {
    const rows = levelTimeline(fighter(THIRD).build().document, content);
    expect(rowOf(rows, 'class')).toBe(1);
    expect(rowOf(rows, FEAT_SLOT_KEYS.level1)).toBe(1);
    expect(rowOf(rows, FEAT_SLOT_KEYS.level2)).toBe(2);
    expect(rowOf(rows, FEAT_SLOT_KEYS.level4)).toBe(FOURTH);
    expect(rowOf(rows, FEAT_SLOT_KEYS.bonus)).toBe(EIGHTH);
    const planned = rows[FOURTH - 1]?.slots.find((slot) => slot.key === FEAT_SLOT_KEYS.level4);
    expect(planned?.status).toBe(SlotStatus.Planned);
  });

  test('shows a pick in its row and an empty slot as unpicked', () => {
    const feat = featSlotFixtureId('power-attack');
    const rows = levelTimeline(fighter(THIRD).picking(FEAT_SLOT_KEYS.level1, feat).build().document, content);
    const level1 = rows[0]?.slots.find((slot) => slot.key === FEAT_SLOT_KEYS.level1);
    const level2 = rows[1]?.slots.find((slot) => slot.key === FEAT_SLOT_KEYS.level2);
    expect(level1?.status).toBe(SlotStatus.Filled);
    expect(level2?.status).toBe(SlotStatus.Open);
  });

  test('holds every slot the sheet lists once, but kept picks and spell slots', () => {
    assert(
      property(integer({ min: 1, max: LEVEL_MAX }), (level) => {
        const { document } = fighter(level).picking(FEAT_SLOT_KEYS.level4, featSlotFixtureId('power-attack')).build();
        const keys = levelTimeline(document, content).flatMap((row) => row.slots.map((slot) => slot.key));
        const listed = characterSlots(document, content)
          .filter((slot) => slot.status !== SlotStatus.Hidden)
          .map((slot) => slot.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(keys)).toStrictEqual(new Set(listed));
      }),
    );
  });
});
