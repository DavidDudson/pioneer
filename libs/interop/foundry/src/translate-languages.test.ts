import { describe, expect, test } from 'bun:test';

import { KindDataGapReason } from './kind-data-gaps';
import { rulesIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

function feat(id: string, name: string, system: object): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    system: {
      category: 'general',
      level: { value: 1 },
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      ...system,
    },
  };
}

const MULTILINGUAL = feat('fEaTlAnGuAgE0001', 'Multilingual', {
  subfeatures: { languages: { granted: [], slots: 2 } },
});
const DWARF_FRIEND = feat('fEaTlAnGuAgE0002', 'Dwarf Friend', {
  subfeatures: { languages: { granted: ['dwarven'], slots: 0 } },
});
const FIRST_DOCTRINE = 'Compendium.pf2e.classfeatures.Item.First Doctrine';
const WILD_TONGUE = feat('fEaTlAnGuAgE0003', 'Wild Tongue', {
  subfeatures: { languages: { granted: ['wildsong'] }, suppressedFeatures: [FIRST_DOCTRINE] },
});
const NOMADIC = feat('fEaTlAnGuAgE0004', 'Nomadic', {
  rules: [
    { key: 'ActiveEffectLike', mode: 'add', path: 'system.build.languages.max', value: 2 },
    {
      key: 'ActiveEffectLike',
      mode: 'add',
      path: 'system.build.languages.max',
      value: 'ternary(eq(@actor.system.skills.society.rank, 4), 2, 0)',
    },
  ],
});

describe('Foundry languages as Language elements', () => {
  test('subfeatures.languages slots open that many slots', () => {
    expect(rulesIn(translate([MULTILINGUAL]), 'multilingual')).toEqual([{ key: 'Language', slots: 2 }]);
  });

  test('a granted language is the language entry its slug names', () => {
    const translation = translate([DWARF_FRIEND]);

    expect(rulesIn(translation, 'dwarf-friend')).toEqual([
      { key: 'Language', grant: [coreRulesId('language:dwarven')] },
    ]);
    expect(gapsOf(translation)).toEqual([]);
  });

  test('a language the import lacks, and every other subfeature, is reported', () => {
    const translation = translate([WILD_TONGUE]);

    expect(rulesIn(translation, 'wild-tongue')).toEqual([]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnmappedField, field: 'subfeatures.suppressedFeatures', raw: [FIRST_DOCTRINE] },
      { reason: KindDataGapReason.UnresolvedReference, field: 'subfeatures.languages.granted', raw: 'wildsong' },
    ]);
  });

  test('an ActiveEffectLike adding a number of languages opens slots; a formula stays in the backlog', () => {
    const translation = translate([NOMADIC]);

    expect(rulesIn(translation, 'nomadic')).toEqual([{ key: 'Language', slots: 2 }]);
    expect(translation.envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['ActiveEffectLike']);
  });
});
