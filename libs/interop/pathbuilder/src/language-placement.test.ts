import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  languageDwarfId,
  languageFixtureId,
  languageFixtures,
} from '@pioneer/character/domain/testing';
import type { LanguageFixture } from '@pioneer/character/domain/testing';
import { ContentRegistry, ContentText } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { entryLookup } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedName } from './import-kind';
import { placeLanguages } from './language-placement';

const registry = new ContentRegistry();
registry.register(languageFixtures());
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LANGUAGES: readonly LanguageFixture[] = ['common', 'dwarven', 'elven', 'goblin', 'draconic'];
const lookup = entryLookup({
  [ImportKind.Language]: LANGUAGES.map((name) => ({ id: languageFixtureId(name), name: ContentText.parse(name) })),
});

const dwarf = new CharacterBuilder().named('Dwarf').picking('ancestry', languageDwarfId).build().document;

function exported(...names: readonly string[]): ImportedName[] {
  return names.map((name): ImportedName => ({ kind: ImportKind.Language, name: PathbuilderName.parse(name) }));
}

describe('placeLanguages', () => {
  test('puts a language the ancestry does not grant in the open slot that offers it', () => {
    const { choices, unplaced } = placeLanguages(dwarf, { slots, lookup }, exported('Common', 'Dwarven', 'Elven'));
    expect(Object.values(choices)).toStrictEqual([languageFixtureId('elven')]);
    expect(unplaced).toStrictEqual([]);
  });

  test('leaves a language unplaced when no slot is left for it', () => {
    const { choices, unplaced } = placeLanguages(dwarf, { slots, lookup }, exported('Common', 'Elven', 'Goblin'));
    expect(Object.keys(choices)).toHaveLength(1);
    expect(unplaced).toHaveLength(1);
  });

  test('ignores a language the content does not have', () => {
    const { choices, unplaced } = placeLanguages(dwarf, { slots, lookup }, exported('Klingon'));
    expect(choices).toStrictEqual({});
    expect(unplaced).toStrictEqual([]);
  });
});
