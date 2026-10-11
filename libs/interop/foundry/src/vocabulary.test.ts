import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA, Rarity, SourceKind } from '@pioneer/rules/sdk';

import { coreRules, coreRulesEntry, coreRulesId, known, playerCore, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import type { ImportTranslation } from './translate-import';
import type { VocabularyEntry } from './vocabulary';
import { VocabularyGapReason } from './vocabulary-items';

const DWARF: DocumentFixture = {
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

const KEEN_NOSE: DocumentFixture = {
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

function vocabularyOf(translation: ImportTranslation, kind: ContentKind): readonly VocabularyEntry[] {
  return translation.vocabulary.filter(({ kindData }) => kindData.kind === kind);
}

function slugsOf(translation: ImportTranslation, kind: ContentKind): readonly string[] {
  return vocabularyOf(translation, kind).map(({ envelope }) => envelope.slug);
}

describe('importVocabulary: traits', () => {
  test('imports each trait the documents use, in core-rules, named from the lang table', () => {
    const [manipulate] = vocabularyOf(translate([KEEN_NOSE]), ContentKind.Trait).filter(
      ({ envelope }) => envelope.slug === 'manipulate',
    );

    expect(manipulate?.envelope).toEqual({
      id: coreRulesId('manipulate'),
      pack: coreRules,
      slug: 'manipulate',
      name: 'Manipulate',
      rarity: Rarity.Common,
      traits: [],
      sources: [{ kind: SourceKind.Book, book: playerCore }],
      description: [],
      rules: [],
    });
  });

  test('appliesTo is every kind whose Foundry trait list holds it, in ContentKind order', () => {
    const traits = vocabularyOf(translate([DWARF, KEEN_NOSE]), ContentKind.Trait);
    const appliesTo = new Map(traits.map(({ envelope, kindData }) => [envelope.slug, kindData.data]));

    expect(appliesTo.get('dwarf')).toEqual({
      appliesTo: [
        ContentKind.Ancestry,
        ContentKind.ClassFeature,
        ContentKind.Creature,
        ContentKind.Feat,
        ContentKind.Heritage,
      ],
    });
    expect(appliesTo.get('manipulate')).toEqual({
      appliesTo: [
        ContentKind.Action,
        ContentKind.ClassFeature,
        ContentKind.Feat,
        ContentKind.Ritual,
        ContentKind.Spell,
      ],
    });
  });

  test('a trait in no Foundry list is not imported and stays unknown to the envelope', () => {
    const translation = translate([KEEN_NOSE]);

    expect(slugsOf(translation, ContentKind.Trait)).not.toContain('homebrewed');
    expect(translation.envelopes.unknownTraits.map(({ trait }) => trait)).toEqual(['homebrewed']);
  });

  test('a trait another pack already has is left to that entry', () => {
    const translation = translate([KEEN_NOSE], { known: [...known, coreRulesEntry(ContentKind.Trait, 'manipulate')] });

    expect(slugsOf(translation, ContentKind.Trait)).toEqual(['dwarf']);
    expect(translation.envelopes.unknownTraits.map(({ trait }) => trait)).toEqual(['homebrewed']);
  });

  test('a trait whose slug a core-rules entry of another kind has is reported, since a trait cannot be suffixed', () => {
    const translation = translate([KEEN_NOSE], { known: [...known, coreRulesEntry(ContentKind.Statistic, 'dwarf')] });

    expect(slugsOf(translation, ContentKind.Trait)).toEqual(['manipulate']);
    expect(translation.vocabularyGaps).toContainEqual({
      kind: ContentKind.Trait,
      slug: 'dwarf',
      reason: VocabularyGapReason.SlugTaken,
      detail: 'dwarf',
    });
  });

  test("trait entries never take a document's slug: the Dwarf ancestry keeps `dwarf`", () => {
    const translation = translate([DWARF]);

    expect(translation.entries.map(({ envelope }) => envelope.slug)).toEqual(['dwarf']);
    expect(slugsOf(translation, ContentKind.Trait)).toContain('dwarf');
  });

  test('a label missing from the lang table is reported', () => {
    const translation = translate([KEEN_NOSE], { lang: {} });

    expect(translation.vocabulary).toEqual([]);
    expect(translation.vocabularyGaps).toContainEqual({
      kind: ContentKind.Trait,
      slug: 'manipulate',
      reason: VocabularyGapReason.MissingLabel,
      detail: 'PF2E.TraitManipulate',
    });
  });
});

describe('importVocabulary: languages', () => {
  test("imports an ancestry's languages that core-rules lacks, with Foundry's rarity", () => {
    const languages = vocabularyOf(translate([DWARF]), ContentKind.Language);

    expect(languages.map(({ envelope }) => [envelope.slug, envelope.rarity])).toEqual([
      ['petran', Rarity.Uncommon],
      ['aklo', Rarity.Rare],
    ]);
  });

  test('a secret language and a language Foundry does not define are reported', () => {
    const { vocabularyGaps } = translate([DWARF]);

    expect(vocabularyGaps).toContainEqual({
      kind: ContentKind.Language,
      slug: 'wildsong',
      reason: VocabularyGapReason.UnmappedValue,
      detail: 'secret',
    });
    expect(vocabularyGaps).toContainEqual({
      kind: ContentKind.Language,
      slug: 'gibberish',
      reason: VocabularyGapReason.UnknownValue,
      detail: 'gibberish',
    });
  });
});

describe('importVocabulary: senses', () => {
  test("imports senses from ancestry vision and Sense rule elements, skipping core-rules' darkvision", () => {
    const senses = vocabularyOf(translate([DWARF, KEEN_NOSE]), ContentKind.Sense);

    expect(senses.map(({ envelope, kindData }) => [envelope.slug, kindData.data])).toEqual([['scent', {}]]);
  });

  test('a sense with a fixed acuity and unlimited range carries both', () => {
    const senses = vocabularyOf(translate([DWARF], { known: [] }), ContentKind.Sense);

    expect(senses.map(({ kindData }) => kindData.data)).toEqual([{ acuity: 'precise', unlimitedRange: true }]);
  });

  test('a sense Foundry does not define is reported', () => {
    expect(translate([KEEN_NOSE]).vocabularyGaps).toContainEqual({
      kind: ContentKind.Sense,
      slug: 'smell-o-vision',
      reason: VocabularyGapReason.UnknownValue,
      detail: 'smell-o-vision',
    });
  });
});

describe('importVocabulary: damage types', () => {
  test("imports Foundry's damage types that are Pioneer's, cited to the first target book", () => {
    const damageTypes = vocabularyOf(translate([]), ContentKind.DamageType);

    expect(damageTypes.map(({ envelope }) => [envelope.slug, envelope.name, envelope.sources])).toEqual([
      ['bludgeoning', 'Bludgeoning', [{ kind: SourceKind.Book, book: playerCore }]],
      ['fire', 'Fire', [{ kind: SourceKind.Book, book: playerCore }]],
    ]);
  });

  test('a damage type whose slug a trait has takes its kind as a suffix', () => {
    const damageTypes = slugsOf(
      translate([{ id: 'fIrEbOlT00000000', name: 'Fireball', type: 'spell', system: { traits: { value: ['fire'] } } }]),
      ContentKind.DamageType,
    );

    expect(damageTypes).toEqual(['bludgeoning', 'fire-damage-type']);
  });

  test('untyped damage has no Pioneer damage type and is reported', () => {
    expect(translate([]).vocabularyGaps).toEqual([
      { kind: ContentKind.DamageType, slug: 'untyped', reason: VocabularyGapReason.UnmappedValue, detail: 'untyped' },
    ]);
  });
});

describe('importVocabulary: entries parse', () => {
  test.each([ContentKind.Trait, ContentKind.Language, ContentKind.Sense, ContentKind.DamageType])(
    'each %s entry parses against its kind schema and as a ContentEntry',
    (kind) => {
      const entries = vocabularyOf(translate([DWARF, KEEN_NOSE], { known: [] }), kind);

      expect(entries.length).toBeGreaterThan(0);
      for (const { envelope, kindData } of entries) {
        expect(KIND_DATA[kind].safeParse(kindData.data).success).toBe(true);
        expect(
          ContentEntry.safeParse({
            ...envelope,
            kind,
            data: kindData.data,
            sources: [{ kind: SourceKind.Book, book: playerCore, page: 1 }],
          }).error,
        ).toBeUndefined();
      }
    },
  );
});
