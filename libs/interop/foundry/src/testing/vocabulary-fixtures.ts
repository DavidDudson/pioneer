import type { ContentKind } from '@pioneer/rules/sdk';

import type { ImportTranslation } from '../translate-import';
import type { VocabularyEntry } from '../vocabulary';
import type { DocumentFixture } from './import-fixtures';

/** Fixture documents that use vocabulary, and helpers to read the vocabulary the import made of them. */

export const DWARF: DocumentFixture = {
  id: 'BYj5ZvlXZdpaEgA6',
  name: 'Dwarf',
  type: 'ancestry',
  system: {
    traits: { value: ['dwarf', 'humanoid'], rarity: 'common' },
    languages: { custom: '', value: ['common', 'dwarven'] },
    additionalLanguages: { count: 0, custom: '', value: ['petran', 'aklo', 'wildsong', 'gibberish'] },
    vision: 'darkvision',
  },
};

export const MOVER: DocumentFixture = {
  id: 'mOvEr00000000000',
  name: 'Mover',
  type: 'feat',
  system: { traits: { value: ['move'] } },
};

export const KEEN_NOSE: DocumentFixture = {
  id: 'kEEnN0se00000000',
  name: 'Keen Nose',
  type: 'feat',
  system: {
    traits: { value: ['dwarf', 'manipulate', 'homebrewed'] },
    rules: [
      { key: 'Sense', selector: 'scent', acuity: 'imprecise', range: 30 },
      { key: 'Sense', selector: 'smell-o-vision' },
    ],
  },
};

export function vocabularyOf(translation: ImportTranslation, kind: ContentKind): readonly VocabularyEntry[] {
  return translation.vocabulary.filter(({ kindData }) => kindData.kind === kind);
}

/** A value as the assertions compare it, its brands set aside. */
export function plain(value: unknown): unknown {
  return value;
}

export function slugsOf(translation: ImportTranslation, kind: ContentKind): readonly string[] {
  return vocabularyOf(translation, kind).map(({ envelope }) => envelope.slug);
}
