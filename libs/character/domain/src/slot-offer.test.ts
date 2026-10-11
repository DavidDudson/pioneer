import { describe, expect, test } from 'bun:test';

import { entry, idOf, lookupOf, slotOf } from '@pioneer/rules/grants/testing';
import { AncestryId, ChoiceValue, ContentKind, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { ANCESTRY_SLOT } from './character-slots';
import { SlotRefusalField, slotRefusal } from './slot-offer';
import type { SlotContent, SlotRefusal } from './slot-offer';
import { CharacterBuilder } from './testing';

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

const content: SlotContent = { lookup: lookupOf([elf, human]), namespaces: CORE_NAMESPACES };
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
