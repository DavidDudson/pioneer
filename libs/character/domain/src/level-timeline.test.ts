import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Level, SlotRank } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';

import { SlotStatus, SlotSubjectKind } from './character-slot';
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
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
  spellFixtureId,
  spellFixtures,
} from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LEVEL_MAX = 20;
const THIRD = 3;
const FOURTH = 4;
const EIGHTH = 8;
const FIFTH = 5;
/** Each run reads the progression at every level, so a few cover the levels. */
const SPELL_RUNS = 6;

function fighter(level: number): CharacterBuilder {
  return new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(level);
}

/** A bard at `level`: a spontaneous caster with signature spells from 3rd level. */
function bard(level: number): CharacterBuilder {
  return new CharacterBuilder()
    .named('bard')
    .picking('class', playerCoreClassId('bard'))
    .picking('boost:1:class:0', 'cha')
    .atLevel(level);
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

  test('holds every slot the sheet lists once, but kept picks', () => {
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

  test('puts each spell slot at the level its rank first has it, signature spells included', () => {
    const rows = levelTimeline(bard(FIFTH).build().document, content);
    expect(rowOf(rows, 'repertoire:bard:cantrip:0')).toBe(1);
    expect(rowOf(rows, 'repertoire:bard:1:0')).toBe(1);
    expect(rowOf(rows, 'repertoire:bard:2:0')).toBe(THIRD);
    expect(rowOf(rows, 'repertoire:bard:3:0')).toBe(FIFTH);
    expect(rowOf(rows, 'signature:bard:1')).toBe(THIRD);
    expect(rowOf(rows, 'signature:bard:3')).toBe(FIFTH);
  });

  test('reads a spell slot above the character’s level as planned, with a pick or without', () => {
    const forceBarrage = spellFixtureId('force-barrage');
    const { document } = bard(THIRD).picking('repertoire:bard:3:0', forceBarrage).build();
    const rows = levelTimeline(document, content);
    const picked = rows[FIFTH - 1]?.slots.find((slot) => slot.key === 'repertoire:bard:3:0');
    const unpicked = rows[FIFTH - 1]?.slots.find((slot) => slot.key === 'repertoire:bard:3:1');
    expect(picked).toMatchObject({ status: SlotStatus.Planned, level: FIFTH, selection: forceBarrage });
    expect(unpicked).toMatchObject({ status: SlotStatus.Planned, level: FIFTH });
    expect(unpicked).not.toHaveProperty('selection');
  });

  test('reads a spell slot the character has as open or filled, in the row it opened at', () => {
    const forceBarrage = spellFixtureId('force-barrage');
    const { document } = bard(FIFTH).picking('repertoire:bard:1:0', forceBarrage).build();
    const rows = levelTimeline(document, content);
    const filled = rows[0]?.slots.find((slot) => slot.key === 'repertoire:bard:1:0');
    const open = rows[0]?.slots.find((slot) => slot.key === 'repertoire:bard:1:1');
    expect(filled).toMatchObject({ status: SlotStatus.Filled, selection: forceBarrage });
    expect(open?.status).toBe(SlotStatus.Open);
  });

  test('names a cantrip’s and a rank’s slot by their subject', () => {
    const slots = levelTimeline(bard(1).build().document, content).flatMap((row) => row.slots);
    const cantrip = slots.find((slot) => slot.key === 'repertoire:bard:cantrip:0');
    expect(cantrip).toMatchObject({ subject: { kind: SlotSubjectKind.Spell, rank: SlotRank.Cantrip } });
  });

  test('lists each spell slot the character has once, whatever its level', () => {
    assert(
      property(integer({ min: 1, max: LEVEL_MAX }), (level) => {
        const { document } = bard(level).build();
        const keys = levelTimeline(document, content).flatMap((row) => row.slots.map((slot) => slot.key));
        const listed = characterSlots(document, content)
          .filter((slot) => slot.status !== SlotStatus.Hidden)
          .map((slot) => slot.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const key of listed) {
          expect(keys).toContain(key);
        }
      }),
      { numRuns: SPELL_RUNS },
    );
  });
});
