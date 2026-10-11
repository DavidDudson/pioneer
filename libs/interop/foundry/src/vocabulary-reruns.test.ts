import { describe, expect, test } from 'bun:test';

import { ContentKind, Rarity } from '@pioneer/rules/sdk';

import { TRAIT_LIST_KINDS, TraitList } from './foundry-config';
import { config, coreRulesEntry, known, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { DWARF, KEEN_NOSE, MOVER, plain, vocabularyOf } from './testing/vocabulary-fixtures';
import { VocabularyGapReason } from './vocabulary-items';

/** Trait lists where only `list` holds `move`. */
function listsHolding(list: TraitList): ReadonlyMap<TraitList, ReadonlyMap<string, string>> {
  const holding = new Map([['move', 'PF2E.TraitMove']]);
  return new Map(Object.values(TraitList).map((each) => [each, each === list ? holding : new Map<string, string>()]));
}

describe('importVocabulary: re-runs and edge cases', () => {
  test("a re-run with an earlier run's vocabulary in core-rules imports nothing twice, suffixed slugs included", () => {
    const fireball: DocumentFixture = {
      id: 'fIrEbOlT00000000',
      name: 'Fireball',
      type: 'spell',
      system: { traits: { value: ['fire'] } },
    };
    const first = translate([DWARF, KEEN_NOSE, fireball]);
    const earlier = first.vocabulary.map(({ envelope, kindData }) => ({
      id: envelope.id,
      pack: envelope.pack,
      kind: kindData.kind,
      slug: envelope.slug,
    }));
    const again = translate([DWARF, KEEN_NOSE, fireball], { known: [...known, ...earlier] });

    expect(plain(earlier.map(({ slug }) => slug))).toContain('fire-damage-type');
    expect(again.vocabulary).toEqual([]);
  });

  test('a suffixed slug that is taken too is reported, not given a duplicate id', () => {
    const translation = translate([], {
      known: [
        ...known,
        coreRulesEntry(ContentKind.Trait, 'fire'),
        coreRulesEntry(ContentKind.Statistic, 'fire-damage-type'),
      ],
    });

    expect(translation.vocabularyGaps).toContainEqual({
      kind: ContentKind.DamageType,
      slug: 'fire',
      reason: VocabularyGapReason.SlugTaken,
      detail: 'fire',
    });
  });

  test('a common language is common', () => {
    const languages = vocabularyOf(translate([DWARF], { known: [] }), ContentKind.Language);

    expect(plain(languages.map(({ envelope }) => [envelope.slug, envelope.rarity]))).toContainEqual([
      'dwarven',
      Rarity.Common,
    ]);
  });

  test('a label that is no entry name is reported as invalid', () => {
    const translation = translate([KEEN_NOSE], { lang: { PF2E: { TraitDwarf: 'Dwarf', TraitManipulate: '' } } });

    expect(translation.vocabularyGaps).toContainEqual({
      kind: ContentKind.Trait,
      slug: 'manipulate',
      reason: VocabularyGapReason.Invalid,
      detail: '',
    });
  });

  test.each(Object.values(TraitList))('a trait only in %s applies to the kinds TRAIT_LIST_KINDS gives it', (list) => {
    const translation = translate([MOVER], { config: { ...config, traitLists: listsHolding(list) } });
    const [move] = vocabularyOf(translation, ContentKind.Trait);

    expect(plain(move?.kindData.data)).toEqual({
      appliesTo: Object.values(ContentKind).filter((kind) => TRAIT_LIST_KINDS[list].includes(kind)),
    });
  });
});
