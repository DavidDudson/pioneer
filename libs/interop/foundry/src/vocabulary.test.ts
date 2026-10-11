import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA, Rarity, slugName, SourceKind } from '@pioneer/rules/sdk';

import { ACOLYTE } from './testing/build-fixtures';
import { coreRules, coreRulesEntry, coreRulesId, known, playerCore, translate } from './testing/import-fixtures';
import { DWARF, KEEN_NOSE, plain, slugsOf, vocabularyOf } from './testing/vocabulary-fixtures';
import type { VocabularyEntry } from './vocabulary';
import { VocabularyGapReason } from './vocabulary-items';

describe('importVocabulary: traits', () => {
  test('imports each trait the documents use, in core-rules, named from the lang table', () => {
    const manipulate = vocabularyOf(translate([KEEN_NOSE]), ContentKind.Trait).find(
      ({ envelope }) => envelope.slug === 'trait:manipulate',
    );

    expect(plain(manipulate?.envelope)).toEqual({
      id: coreRulesId('trait:manipulate'),
      pack: coreRules,
      slug: 'trait:manipulate',
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
    const appliesTo = new Map<string, unknown>(
      traits.map(({ envelope, kindData }) => [slugName(envelope.slug), kindData.data]),
    );

    expect(appliesTo.get('dwarf')).toEqual({
      appliesTo: [
        ContentKind.Ancestry,
        ContentKind.AncestryFeature,
        ContentKind.ClassFeature,
        ContentKind.Creature,
        ContentKind.Feat,
        ContentKind.Heritage,
      ],
    });
    expect(appliesTo.get('manipulate')).toEqual({
      appliesTo: [
        ContentKind.Action,
        ContentKind.AncestryFeature,
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

  test('a core-rules entry of another kind with the same name does not stop the trait: slugs name their kind', () => {
    const translation = translate([KEEN_NOSE], { known: [...known, coreRulesEntry(ContentKind.Statistic, 'dwarf')] });

    expect(slugsOf(translation, ContentKind.Trait)).toEqual(['dwarf', 'manipulate']);
    expect(translation.vocabularyGaps.map(({ kind }) => kind)).not.toContain(ContentKind.Trait);
  });

  test('the dwarf trait and the Dwarf ancestry are two slugs', () => {
    const translation = translate([DWARF]);
    const traitSlugs = vocabularyOf(translation, ContentKind.Trait).map(({ envelope }) => envelope.slug);

    expect(plain(translation.entries.map(({ envelope }) => envelope.slug))).toEqual(['ancestry:dwarf']);
    expect(plain(traitSlugs)).toContain('trait:dwarf');
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

    expect(plain(languages.map(({ envelope }) => [envelope.slug, envelope.rarity]))).toEqual([
      ['language:petran', Rarity.Uncommon],
      ['language:aklo', Rarity.Rare],
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

    expect(plain(senses.map(({ envelope, kindData }) => [envelope.slug, kindData.data]))).toEqual([
      ['sense:scent', {}],
    ]);
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

    expect(plain(damageTypes.map(({ envelope }) => [envelope.slug, envelope.name, envelope.sources]))).toEqual([
      ['damage-type:bludgeoning', 'Bludgeoning', [{ kind: SourceKind.Book, book: playerCore }]],
      ['damage-type:fire', 'Fire', [{ kind: SourceKind.Book, book: playerCore }]],
    ]);
  });

  test('the fire damage type and the fire trait are two slugs', () => {
    const translation = translate([
      { id: 'fIrEbOlT00000000', name: 'Fireball', type: 'spell', system: { traits: { value: ['fire'] } } },
    ]);
    const fireOf = (kind: ContentKind): VocabularyEntry | undefined =>
      vocabularyOf(translation, kind).find(({ envelope }) => slugName(envelope.slug) === 'fire');
    const trait = fireOf(ContentKind.Trait);
    const damageType = fireOf(ContentKind.DamageType);

    expect(plain(trait?.envelope.slug)).toBe('trait:fire');
    expect(plain(damageType?.envelope.slug)).toBe('damage-type:fire');
    expect(trait?.envelope.id).not.toBe(damageType?.envelope.id);
  });

  test('untyped damage has no Pioneer damage type and is reported', () => {
    expect(translate([]).vocabularyGaps).toEqual([
      { kind: ContentKind.DamageType, slug: 'untyped', reason: VocabularyGapReason.UnmappedValue, detail: 'untyped' },
    ]);
  });
});

describe('importVocabulary: Lore statistics', () => {
  test("a background's Lore is a statistic in core-rules, keyed by topic and named as Foundry names it", () => {
    const [scribing] = vocabularyOf(translate([ACOLYTE]), ContentKind.Statistic);

    expect(plain(scribing?.envelope.slug)).toBe('statistic:scribing-lore');
    expect(plain(scribing?.envelope.name)).toBe('Scribing Lore');
    expect(plain(scribing?.envelope.pack)).toBe(coreRules);
    expect(plain(scribing?.kindData.data)).toEqual({
      selector: 'skill:lore:scribing',
      domains: ['check', 'skill-check', 'int-based', 'lore'],
      base: '@attr.int + @prof.skill.lore.scribing',
      kind: 'check',
      keyAttribute: 'int',
    });
  });

  test('a Lore another pack already has is left to that entry', () => {
    const translation = translate([ACOLYTE], {
      known: [...known, coreRulesEntry(ContentKind.Statistic, 'scribing-lore')],
    });

    expect(slugsOf(translation, ContentKind.Statistic)).toEqual([]);
  });
});

describe('importVocabulary: entries parse', () => {
  test.each([
    ContentKind.Trait,
    ContentKind.Language,
    ContentKind.Sense,
    ContentKind.Statistic,
    ContentKind.DamageType,
  ])('each %s entry parses against its kind schema and as a ContentEntry', (kind) => {
    const entries = vocabularyOf(translate([DWARF, KEEN_NOSE, ACOLYTE], { known: [] }), kind);

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
  });
});
