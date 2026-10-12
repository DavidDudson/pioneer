import { describe, expect, test } from 'bun:test';

import { entry, idOf, lookupOf, slotOf } from '@pioneer/rules/grants/testing';
import { AncestryId, ChoiceValue, ContentKind, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { ANCESTRY_SLOT } from './character-slots';
import { SlotRefusalField, slotRefusal } from './slot-offer';
import type { SlotContent, SlotRefusal } from './slot-offer';
import {
  BOOST_FIXTURES,
  NO_FEATS,
  NO_LANGUAGES,
  NO_SKILLS,
  NO_SPELLS,
  boostFixtureId,
  CharacterBuilder,
} from './testing';

/** Only up to 5th level. */
const LOW_LEVEL = [{ lte: ['self:level', 5] }];

/**
 * An elf whose rule 0 asks for a pick only up to 5th level, and whose rule 1 asks at every level but offers Stealth
 * only up to 5th.
 */
const elf = {
  ...entry('elf', [
    { key: 'ChoiceSet', flag: 'early', predicate: LOW_LEVEL, choices: [{ value: 'cavern', label: 'Cavern' }] },
    {
      key: 'ChoiceSet',
      flag: 'skill',
      choices: [
        { value: 'athletics', label: 'Athletics' },
        { value: 'stealth', label: 'Stealth', predicate: LOW_LEVEL },
      ],
    },
  ]),
  kind: ContentKind.Ancestry,
};
const human = { ...entry('human'), kind: ContentKind.Ancestry };

const content: SlotContent = {
  lookup: lookupOf([elf, human]),
  namespaces: CORE_NAMESPACES,
  boosts: BOOST_FIXTURES,
  skills: NO_SKILLS,
  languages: NO_LANGUAGES,
  spells: NO_SPELLS,
  feats: NO_FEATS,
};
const earlySlot = slotOf('elf', 0);
const skillSlot = slotOf('elf', 1);

function anElf(): CharacterDocument {
  return new CharacterBuilder().withAncestry(AncestryId.parse(idOf('elf'))).build().document;
}

function refusal(slot: SlotKey, selection: string): SlotRefusal | undefined {
  return slotRefusal(anElf(), content, { slot, selection: ChoiceValue.parse(selection) });
}

const notOffered: SlotRefusal = {
  field: SlotRefusalField.Selection,
  message: { key: 'character.validation.selectionNotOffered' },
};

describe('slotRefusal', () => {
  test('takes a root slot pick of its kind, and refuses anything else as not offered', () => {
    expect(refusal(ANCESTRY_SLOT, idOf('human'))).toBeUndefined();
    expect(refusal(ANCESTRY_SLOT, 'cavern')).toStrictEqual(notOffered);
  });

  test('finds a slot an earlier pick opened, and takes an option it offers', () => {
    expect(refusal(skillSlot, 'athletics')).toBeUndefined();
  });

  test('takes a pick for a slot open only below 20th level', () => {
    expect(refusal(earlySlot, 'cavern')).toBeUndefined();
  });

  test('takes an option offered only below 20th level', () => {
    expect(refusal(skillSlot, 'stealth')).toBeUndefined();
  });

  test('refuses an option no level offers, blaming the selection, even when the slot is open only below 20th', () => {
    expect(refusal(skillSlot, 'arcana')).toStrictEqual(notOffered);
    expect(refusal(earlySlot, 'woodland')).toStrictEqual(notOffered);
  });

  test('refuses a slot the character has at no level, blaming the slot', () => {
    expect(refusal(SlotKey.parse('feat:class:2'), 'athletics')).toStrictEqual({
      field: SlotRefusalField.Slot,
      message: { key: 'character.validation.slotNotOpen' },
    });
  });

  test('without the pick that opened it, the slot is not there', () => {
    const humanDocument = new CharacterBuilder().withAncestry(AncestryId.parse(idOf('human'))).build().document;
    const pick = { slot: skillSlot, selection: ChoiceValue.parse('athletics') };
    expect(slotRefusal(humanDocument, content, pick)?.field).toBe(SlotRefusalField.Slot);
  });
});

describe('slotRefusal on a boost slot', () => {
  const dwarf = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf')))
    .picking('boost:1:free:0', 'str')
    .build().document;

  function boostRefusal(slot: string, selection: string): SlotRefusal | undefined {
    return slotRefusal(dwarf, content, { slot: SlotKey.parse(slot), selection: ChoiceValue.parse(selection) });
  }

  test('takes an attribute the boost allows, at any level up to 20th', () => {
    expect(boostRefusal('boost:1:ancestry:2', 'str')).toBeUndefined();
    expect(boostRefusal('boost:20:free:3', 'cha')).toBeUndefined();
  });

  test('refuses what the boost doesn’t offer: a fixed boost’s attribute, or no attribute at all', () => {
    expect(boostRefusal('boost:1:ancestry:2', 'con')).toStrictEqual(notOffered);
    expect(boostRefusal('boost:1:free:1', 'forest')).toStrictEqual(notOffered);
  });

  test('refuses an attribute another boost of the same set already raises', () => {
    expect(boostRefusal('boost:1:free:1', 'str')).toStrictEqual({
      field: SlotRefusalField.Selection,
      message: { key: 'character.validation.boostTaken' },
    });
    expect(boostRefusal('boost:1:free:0', 'str')).toBeUndefined();
    expect(boostRefusal('boost:5:free:0', 'str')).toBeUndefined();
  });

  test('refuses a boost slot the character doesn’t have, blaming the slot', () => {
    expect(boostRefusal('boost:1:background:0', 'con')).toStrictEqual({
      field: SlotRefusalField.Slot,
      message: { key: 'character.validation.slotNotOpen' },
    });
  });
});

describe('slotRefusal on a voluntary flaw slot', () => {
  const dwarf = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf')))
    .picking('flaw:1:ancestry:0', 'int')
    .build().document;

  function flawRefusal(slot: string, selection: string): SlotRefusal | undefined {
    return slotRefusal(dwarf, content, { slot: SlotKey.parse(slot), selection: ChoiceValue.parse(selection) });
  }

  test('takes an attribute the ancestry doesn’t flaw, and its own pick again', () => {
    expect(flawRefusal('flaw:1:ancestry:1', 'str')).toBeUndefined();
    expect(flawRefusal('flaw:1:ancestry:0', 'int')).toBeUndefined();
  });

  test('refuses the ancestry’s own flaw, or no attribute at all', () => {
    expect(flawRefusal('flaw:1:ancestry:1', 'cha')).toStrictEqual(notOffered);
    expect(flawRefusal('flaw:1:ancestry:1', 'forest')).toStrictEqual(notOffered);
  });

  test('refuses an attribute another voluntary flaw already lowers', () => {
    expect(flawRefusal('flaw:1:ancestry:1', 'int')).toStrictEqual({
      field: SlotRefusalField.Selection,
      message: { key: 'character.validation.flawTaken' },
    });
  });

  test('refuses a flaw slot past one per attribute the ancestry leaves, blaming the slot', () => {
    expect(flawRefusal('flaw:1:ancestry:5', 'str')).toStrictEqual({
      field: SlotRefusalField.Slot,
      message: { key: 'character.validation.slotNotOpen' },
    });
  });
});
