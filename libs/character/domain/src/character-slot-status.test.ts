import { describe, expect, test } from 'bun:test';

import { entry, idOf, lookupOf, slotOf } from '@pioneer/rules/grants/testing';
import { AncestryId, ContentKind, ContentText } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { CharacterSlot, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { ANCESTRY_SLOT, BACKGROUND_SLOT, CLASS_SLOT, HERITAGE_SLOT } from './character-slots';
import type { SlotContent } from './slot-offer';
import { BOOST_FIXTURES, NO_SKILLS, boostFixtureId, CharacterBuilder } from './testing';

const LOW_LEVEL = [{ lte: ['self:level', 5] }];
const FROM_FIFTH = [{ gte: ['self:level', 5] }];

/**
 * An elf whose rule 0 asks only up to 5th level, whose rule 1 asks at every level but offers Stealth only up to 5th
 * and Nature only from 5th, and whose rule 2 asks only from 5th.
 */
const elf = {
  ...entry('elf', [
    { key: 'ChoiceSet', flag: 'early', predicate: LOW_LEVEL, choices: [{ value: 'cavern', label: 'Cavern' }] },
    {
      key: 'ChoiceSet',
      flag: 'skill',
      prompt: 'Elf skill',
      choices: [
        { value: 'athletics', label: 'Athletics' },
        { value: 'stealth', label: 'Stealth', predicate: LOW_LEVEL },
        { value: 'nature', label: 'Nature', predicate: FROM_FIFTH },
      ],
    },
    { key: 'ChoiceSet', flag: 'late', predicate: FROM_FIFTH, choices: [{ value: 'woodland', label: 'Woodland' }] },
  ]),
  name: ContentText.parse('Elf'),
  kind: ContentKind.Ancestry,
};
const dwarf = {
  ...entry('dwarf'),
  id: boostFixtureId('ancestry:dwarf'),
  name: ContentText.parse('Dwarf'),
  kind: ContentKind.Ancestry,
};

const content: SlotContent = {
  lookup: lookupOf([elf, dwarf]),
  namespaces: CORE_NAMESPACES,
  boosts: BOOST_FIXTURES,
  skills: NO_SKILLS,
};
const earlySlot = slotOf('elf', 0);
const skillSlot = slotOf('elf', 1);
const lateSlot = slotOf('elf', 2);

function anElf(level = 1): CharacterBuilder {
  return new CharacterBuilder().withAncestry(AncestryId.parse(idOf('elf'))).atLevel(level);
}

function aDwarf(level = 1): CharacterBuilder {
  return new CharacterBuilder().withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf'))).atLevel(level);
}

function slotsOf(builder: CharacterBuilder): readonly CharacterSlot[] {
  return characterSlots(builder.build().document, content);
}

function slot(builder: CharacterBuilder, key: string): CharacterSlot | undefined {
  return slotsOf(builder).find((each) => each.key === key);
}

describe('characterSlots', () => {
  test('lists the character’s own slots first, a picked one filled with its entry’s name', () => {
    const [ancestry, heritage, background, characterClass] = slotsOf(anElf());
    expect(ancestry).toStrictEqual(
      CharacterSlot.parse({
        status: SlotStatus.Filled,
        key: ANCESTRY_SLOT,
        subject: { kind: 'root', content: ContentKind.Ancestry },
        selection: idOf('elf'),
        selectionName: 'Elf',
      }),
    );
    expect(heritage).toMatchObject({ status: SlotStatus.Open, key: HERITAGE_SLOT });
    expect(background).toMatchObject({ status: SlotStatus.Open, key: BACKGROUND_SLOT });
    expect(characterClass).toMatchObject({ status: SlotStatus.Open, key: CLASS_SLOT });
  });

  test('lists a ChoiceSet an entry grants, open, then filled with the option’s label', () => {
    expect(slot(anElf(), skillSlot)).toStrictEqual(
      CharacterSlot.parse({
        status: SlotStatus.Open,
        key: skillSlot,
        subject: { kind: 'choice', entry: idOf('elf'), entryName: 'Elf', prompt: 'Elf skill' },
      }),
    );
    expect(slot(anElf().picking(skillSlot, 'athletics'), skillSlot)).toMatchObject({
      status: SlotStatus.Filled,
      selection: 'athletics',
      selectionName: 'Athletics',
    });
  });

  test('a slot that opens above the character’s level is planned at the level it opens, picked or not', () => {
    expect(slot(anElf(3), lateSlot)).toMatchObject({ status: SlotStatus.Planned, level: 5 });
    expect(slot(anElf(3).picking(lateSlot, 'woodland'), lateSlot)).toMatchObject({
      status: SlotStatus.Planned,
      level: 5,
      selection: 'woodland',
      selectionName: 'Woodland',
    });
    expect(slot(anElf(5), lateSlot)).toMatchObject({ status: SlotStatus.Open });
  });

  test('a pick offered only above the character’s level is planned at the first level that offers it', () => {
    expect(slot(anElf(3).picking(skillSlot, 'nature'), skillSlot)).toMatchObject({
      status: SlotStatus.Planned,
      level: 5,
      selection: 'nature',
      selectionName: 'Nature',
    });
  });

  test('a pick the slot doesn’t offer is invalid, with the reason; a planned one is flagged at its level', () => {
    expect(slot(anElf().picking(skillSlot, 'arcana'), skillSlot)).toMatchObject({
      status: SlotStatus.Invalid,
      selection: 'arcana',
      reason: { key: 'rules.choices.invalid.notOffered' },
    });
    expect(slot(anElf(3).picking(lateSlot, 'forest'), lateSlot)).toMatchObject({
      status: SlotStatus.Invalid,
      level: 5,
      reason: { key: 'rules.choices.invalid.notOffered' },
    });
  });

  test('a pick whose prerequisite the character lost is invalid', () => {
    expect(slot(anElf(10).picking(skillSlot, 'stealth'), skillSlot)).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.notOffered' },
    });
  });

  test('a pick of content no loaded pack has is invalid as not loaded', () => {
    const gnome = new CharacterBuilder().withAncestry(AncestryId.parse(idOf('gnome')));
    expect(slot(gnome, ANCESTRY_SLOT)).toMatchObject({
      status: SlotStatus.Invalid,
      selection: idOf('gnome'),
      reason: { key: 'rules.choices.invalid.contentNotLoaded' },
    });
  });

  test('a pick kept for a slot the character no longer has is hidden, never dropped', () => {
    const slots = slotsOf(anElf(10).picking(earlySlot, 'cavern').picking('feat:class:2', 'athletics'));
    const hidden = [
      { status: SlotStatus.Hidden, key: earlySlot, selection: 'cavern' },
      { status: SlotStatus.Hidden, key: 'feat:class:2', selection: 'athletics' },
    ].map((each) => CharacterSlot.parse(each));
    const kept: readonly CharacterSlot[] = slots.filter((each) => each.status === SlotStatus.Hidden);
    expect(kept).toStrictEqual(hidden);
    expect(slot(anElf(5).picking(earlySlot, 'cavern'), earlySlot)?.status).toBe(SlotStatus.Filled);
  });

  test('lists every slot and every stored pick once', () => {
    const builder = anElf(3).picking(skillSlot, 'athletics').picking(earlySlot, 'cavern').picking('gone', 'x');
    const keys: string[] = slotsOf(builder).map((each) => each.key);
    const stored = Object.keys(builder.build().document.build.choices);
    expect(new Set(keys).size).toBe(keys.length);
    expect(stored.filter((key) => !keys.includes(key))).toStrictEqual([]);
  });
});

describe('characterSlots for boosts', () => {
  test('lists boost slots after the character’s own, in level order, planned above its level', () => {
    const slots = slotsOf(aDwarf(4)).filter((each) => each.key.startsWith('boost:'));
    expect(slots[0]).toStrictEqual(
      CharacterSlot.parse({
        status: SlotStatus.Open,
        key: 'boost:1:ancestry:2',
        subject: { kind: 'boost', source: 'ancestry', level: 1 },
      }),
    );
    expect(slots.find((each) => each.key === 'boost:1:free:0')?.status).toBe(SlotStatus.Open);
    expect(slots.find((each) => each.key === 'boost:5:free:0')).toMatchObject({ status: SlotStatus.Planned, level: 5 });
  });

  test('a boost filled with an attribute it offers; one it doesn’t, or one its set already raised, is invalid', () => {
    const builder = aDwarf()
      .picking('boost:1:ancestry:2', 'con')
      .picking('boost:1:free:0', 'str')
      .picking('boost:1:free:1', 'str');
    expect(slot(builder, 'boost:1:ancestry:2')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.notOffered' },
    });
    expect(slot(builder, 'boost:1:free:0')).toMatchObject({ status: SlotStatus.Filled, selection: 'str' });
    expect(slot(builder, 'boost:1:free:1')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.boostTaken' },
    });
  });
});

describe('characterSlots for voluntary flaws', () => {
  test('lists no empty flaw slot: a voluntary flaw is optional', () => {
    expect(slotsOf(aDwarf()).filter((each) => each.key.startsWith('flaw:'))).toStrictEqual([]);
  });

  test('a flaw taken is filled, after the boosts; one the ancestry has, or one taken twice, is invalid', () => {
    const builder = aDwarf()
      .picking('flaw:1:ancestry:0', 'int')
      .picking('flaw:1:ancestry:1', 'cha')
      .picking('flaw:1:ancestry:2', 'int');
    const flaws = slotsOf(builder).filter((each) => each.key.startsWith('flaw:'));
    expect(flaws[0]).toStrictEqual(
      CharacterSlot.parse({
        status: SlotStatus.Filled,
        key: 'flaw:1:ancestry:0',
        subject: { kind: 'flaw' },
        selection: 'int',
      }),
    );
    expect(flaws[1]).toMatchObject({ status: SlotStatus.Invalid, reason: { key: 'rules.choices.invalid.notOffered' } });
    expect(flaws[2]).toMatchObject({ status: SlotStatus.Invalid, reason: { key: 'rules.choices.invalid.flawTaken' } });
    const keys: string[] = slotsOf(builder).map((each) => each.key);
    expect(keys.indexOf('flaw:1:ancestry:0')).toBeGreaterThan(keys.indexOf('boost:20:free:3'));
  });
});
