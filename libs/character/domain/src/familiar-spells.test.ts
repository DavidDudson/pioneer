import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import { characterSlots } from './character-slot-status';
import { characterGrants, classContent, subclassSlot } from './class-build';
import {
  FamiliarSlotKind,
  FamiliarSpellRefusal,
  familiarSpellRefusal,
  familiarSpellSlots,
  isFamiliarSpellKey,
} from './familiar-spells';
import type { FamiliarSpellSlot } from './familiar-spells';
import { preparedReads, slotContent } from './slot-offer';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  playerCoreId,
  spellFixtureId,
  spellFixtures,
} from './testing';
import type { PlayerCoreClass, SpellFixture } from './testing';

const registry = new ContentRegistry();

registry.register(playerCoreClasses());

registry.register(spellFixtures());

const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const classes = classContent(registry);

/** The patron the witch picks: it gives the entry, in its tradition. */
const PATRON = 'the-inscribed-one';

function character(
  name: PlayerCoreClass,
  level: number,
  picks: Readonly<Record<string, SpellFixture>> = {},
): CharacterDocument {
  const base = new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking('boost:1:class:0', 'str')
    .atLevel(level);

  const slot = subclassSlot(characterGrants(base.build().document, content), content.lookup, classes);

  let builder =
    name === 'witch' ? base.picking(String(slot?.key), playerCoreId(ContentKind.ClassFeature, PATRON)) : base;

  for (const [key, spell] of Object.entries(picks)) {
    builder = builder.picking(key, spellFixtureId(spell));
  }

  return builder.build().document;
}

function slotsOf(document: CharacterDocument): Array<FamiliarSpellSlot> {
  return familiarSpellSlots(document, preparedReads(document, content));
}

const countOf = (slots: ReadonlyArray<FamiliarSpellSlot>, kind: FamiliarSlotKind): number =>
  slots.filter((slot) => slot.kind === kind).length;

describe('the spells a witch’s familiar knows', () => {
  test('a character who is not a witch has none', () => {
    expect(slotsOf(character('wizard', 5))).toStrictEqual([]);
  });

  test('a 1st-level witch’s familiar starts with 10 cantrips, five 1st-rank spells and the lesson’s', () => {
    const slots = slotsOf(character('witch', 1));

    expect([
      countOf(slots, FamiliarSlotKind.Cantrip),
      countOf(slots, FamiliarSlotKind.FirstRank),
      countOf(slots, FamiliarSlotKind.Lesson),
      countOf(slots, FamiliarSlotKind.Level),
    ]).toStrictEqual([10, 5, 1, 0]);
  });

  test('each level after the first adds two spells', () => {
    const slots = slotsOf(character('witch', 4));

    expect(countOf(slots, FamiliarSlotKind.Level)).toBe(6);
    expect(slots.filter((slot) => slot.level === 3)).toHaveLength(2);
  });

  test('a cantrip slot offers cantrips and a 1st-rank slot only 1st-rank spells', () => {
    const slots = slotsOf(character('witch', 5));
    const cantrip = slots.find((slot) => slot.kind === FamiliarSlotKind.Cantrip);
    const first = slots.find((slot) => slot.kind === FamiliarSlotKind.FirstRank);

    expect(cantrip?.options.every((spell) => spell.cantrip)).toBe(true);
    expect(first?.options.every((spell) => !spell.cantrip && spell.rank === 1)).toBe(true);
  });

  test('a spell taught at a level can be of any rank the witch can cast', () => {
    const slots = slotsOf(character('witch', 5));
    const taught = slots.find((slot) => slot.kind === FamiliarSlotKind.Level);

    expect(taught?.options.some((spell) => spell.rank > 1)).toBe(true);
  });

  test('keys are the witch’s, so a replacement familiar reads the same spells', () => {
    const keys = slotsOf(character('witch', 2)).map((slot) => String(slot.key));

    expect(keys).toContain('familiar:cantrip:0');
    expect(keys).toContain('familiar:lesson');
    expect(keys).toContain('familiar:level:2:1');
    expect(keys.every((key) => isFamiliarSpellKey(SlotKey.parse(key)))).toBe(true);
  });
});

describe('picking a spell the familiar knows', () => {
  test('a spell the slot takes is accepted', () => {
    const document = character('witch', 1);
    const reads = preparedReads(document, content);
    const selection = spellFixtureId('force-barrage');

    expect(
      familiarSpellRefusal(document, reads, { slot: SlotKey.parse('familiar:first-rank:0'), selection }),
    ).toBeUndefined();
  });

  test('a spell of too high a rank is refused', () => {
    const document = character('witch', 5);
    const reads = preparedReads(document, content);
    const selection = spellFixtureId('fireball');

    expect(familiarSpellRefusal(document, reads, { slot: SlotKey.parse('familiar:first-rank:0'), selection })).toBe(
      FamiliarSpellRefusal.NotOffered,
    );
  });

  test('a slot the witch lacks at its level is not open', () => {
    const document = character('witch', 1);
    const reads = preparedReads(document, content);
    const selection = spellFixtureId('force-barrage');

    expect(familiarSpellRefusal(document, reads, { slot: SlotKey.parse('familiar:level:2:0'), selection })).toBe(
      FamiliarSpellRefusal.NotOpen,
    );
  });

  test('the slots read as familiar spell slots, filled once a spell is picked', () => {
    const document = character('witch', 1, { 'familiar:first-rank:0': 'force-barrage' });

    const slots = characterSlots(document, content).filter(
      (slot) => 'subject' in slot && slot.subject.kind === SlotSubjectKind.FamiliarSpell,
    );

    expect(slots).toHaveLength(16);
    expect(slots.find((slot) => slot.key === SlotKey.parse('familiar:first-rank:0'))?.status).toBe(SlotStatus.Filled);
    expect(slots.find((slot) => slot.key === SlotKey.parse('familiar:first-rank:1'))?.status).toBe(SlotStatus.Open);
  });
});
