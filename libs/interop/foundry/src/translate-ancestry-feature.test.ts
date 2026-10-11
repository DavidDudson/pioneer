import { describe, expect, test } from 'bun:test';

import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

import { SUDDEN_CHARGE } from './testing/build-fixtures';
import { kindDataOf, rulesIn, slugIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

describe('translateKindData: ancestry features', () => {
  test('a feat of category ancestryfeature is the ancestry-feature kind, with its rules', () => {
    const feature = translate([
      {
        id: 'keenNose00000001',
        name: 'Keen Nose',
        type: 'feat',
        system: {
          category: 'ancestryfeature',
          actionType: { value: 'passive' },
          actions: { value: FOUNDRY_NULL },
          traits: { rarity: 'common', value: [] },
          rules: [{ key: 'Sense', selector: 'scent', acuity: 'imprecise', range: 30 }],
        },
      },
    ]);

    expect(slugIn(feature, 'keen-nose')).toBe('ancestry-feature:keen-nose');
    expect(kindDataOf(feature, 'keen-nose')).toEqual({ kind: ContentKind.AncestryFeature, data: {} });
    expect(rulesIn(feature, 'keen-nose')).toEqual([
      { key: RuleElementKey.Sense, sense: coreRulesId('sense:scent'), acuity: 'imprecise', range: 30 },
    ]);
    expect(gapsOf(feature)).toEqual([]);
  });

  test('an ancestry feature used as an action carries its action', () => {
    const feature = translate([{ ...SUDDEN_CHARGE, system: { ...SUDDEN_CHARGE.system, category: 'ancestryfeature' } }]);

    expect(kindDataOf(feature, 'sudden-charge')).toEqual({
      kind: ContentKind.AncestryFeature,
      data: { action: { cost: 'two' } },
    });
  });
});
