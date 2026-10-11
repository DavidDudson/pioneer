import { describe, expect, test } from 'bun:test';

import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import type { GrantEntry } from '@pioneer/rules/grants';
import { AncestryId, ChoiceValue, ContentKind, ContentText } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { HERITAGE_SLOT } from './character-slots';
import { unfitPicks } from './dependent-picks';
import type { SlotContent } from './slot-offer';
import { BOOST_FIXTURES, CharacterBuilder } from './testing';

function named(base: GrantEntry, kind: ContentKind, name: string): GrantEntry {
  return { ...base, kind, name: ContentText.parse(name) };
}

const elf = named(entry('elf'), ContentKind.Ancestry, 'Elf');
const human = named(entry('human'), ContentKind.Ancestry, 'Human');
const whisperElf = { ...named(entry('whisper-elf'), ContentKind.Heritage, 'Whisper Elf'), belongsTo: idOf('elf') };
const changeling = named(entry('changeling'), ContentKind.Heritage, 'Changeling');

const content: SlotContent = {
  lookup: lookupOf([elf, human, whisperElf, changeling]),
  namespaces: CORE_NAMESPACES,
  boosts: BOOST_FIXTURES,
};

function document(ancestry: string | undefined, heritage: string): CharacterDocument {
  const builder = new CharacterBuilder().picking(HERITAGE_SLOT, idOf(heritage));
  return (ancestry === undefined ? builder : builder.withAncestry(AncestryId.parse(idOf(ancestry)))).build().document;
}

function withoutAncestry(before: CharacterDocument): CharacterDocument {
  const { ancestry: _ancestry, ...choices } = before.build.choices;
  return { ...before, build: { ...before.build, choices } };
}

describe('unfitPicks', () => {
  test('a heritage of the old ancestry is cleared when the new one does not offer it, named', () => {
    expect(unfitPicks(document('elf', 'whisper-elf'), document('human', 'whisper-elf'), content)).toStrictEqual([
      { key: HERITAGE_SLOT, selection: ChoiceValue.parse(idOf('whisper-elf')), selectionName: 'Whisper Elf' },
    ]);
  });

  test('clearing the ancestry clears its heritage too', () => {
    const before = document('elf', 'whisper-elf');
    expect(unfitPicks(before, withoutAncestry(before), content).map((pick) => pick.key)).toEqual([HERITAGE_SLOT]);
  });

  test('a versatile heritage fits every ancestry, so it stays', () => {
    expect(unfitPicks(document('elf', 'changeling'), document('human', 'changeling'), content)).toEqual([]);
  });

  test('a heritage that did not fit before the edit is not the edit’s doing, so it stays to be flagged', () => {
    expect(unfitPicks(document('human', 'whisper-elf'), document('human', 'whisper-elf'), content)).toEqual([]);
  });

  test('picking the heritage itself clears nothing', () => {
    expect(unfitPicks(document('elf', 'changeling'), document('elf', 'whisper-elf'), content)).toEqual([]);
  });
});
