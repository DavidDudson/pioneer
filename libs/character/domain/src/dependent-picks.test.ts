import { describe, expect, test } from 'bun:test';

import type { GrantEntry } from '@pioneer/rules/grants';
import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { AncestryId, ContentKind, ContentText } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { ANCESTRY_SLOT, HERITAGE_SLOT } from './character-slots';
import { ClearedPick, unfitPicks } from './dependent-picks';
import type { SlotContent } from './slot-offer';
import { BOOST_FIXTURES, NO_LANGUAGES, NO_SKILLS, NO_SPELLS, CharacterBuilder } from './testing';

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
  skills: NO_SKILLS,
  languages: NO_LANGUAGES,
  spells: NO_SPELLS,
};

function document(ancestry: string, heritage: string): CharacterDocument {
  const builder = new CharacterBuilder().withAncestry(AncestryId.parse(idOf(ancestry)));
  return builder.picking(HERITAGE_SLOT, idOf(heritage)).build().document;
}

function withoutAncestry(before: CharacterDocument): CharacterDocument {
  const choices = Object.fromEntries(Object.entries(before.build.choices).filter(([key]) => key !== ANCESTRY_SLOT));
  return { ...before, build: { ...before.build, choices } };
}

describe('unfitPicks', () => {
  test('a heritage of the old ancestry is cleared when the new one does not offer it, named', () => {
    expect(unfitPicks(document('elf', 'whisper-elf'), document('human', 'whisper-elf'), content)).toStrictEqual([
      ClearedPick.parse({ key: HERITAGE_SLOT, selection: idOf('whisper-elf'), selectionName: 'Whisper Elf' }),
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
