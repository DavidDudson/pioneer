import { describe, expect, test } from 'bun:test';

import { ContentKind } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { kindDataOf } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

/** A class feature of Foundry's, as a rogue's racket is, with `subfeatures`. */
function racket(name: string, subfeatures: object): DocumentFixture {
  return {
    id: name.toLowerCase().padEnd(16, '0'),
    name,
    type: 'feat',
    system: {
      category: 'classfeature',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      traits: { rarity: 'common', value: ['rogue'], otherTags: ['rogue-racket'] },
      subfeatures,
    },
  };
}

describe('translateKindData: key attribute options', () => {
  test("a class feature's keyOptions are the attributes it adds to its class's key attribute", () => {
    const ruffian = translate([racket('Ruffian', { keyOptions: ['str'] })]);

    expect(kindDataOf(ruffian, 'ruffian')).toEqual({
      kind: ContentKind.ClassFeature,
      data: { tags: ['rogue-racket'], keyAttributeOptions: ['str'] },
    });
    expect(gapsOf(ruffian)).toEqual([]);
  });

  test('an empty list adds nothing', () => {
    const thief = translate([racket('Thief', { keyOptions: [] })]);

    expect(kindDataOf(thief, 'thief')).toEqual({ kind: ContentKind.ClassFeature, data: { tags: ['rogue-racket'] } });
  });

  test('a value that is no attribute is reported and left off', () => {
    const odd = translate([racket('Odd', { keyOptions: ['int', 'luck'] })]);

    expect(kindDataOf(odd, 'odd')).toMatchObject({ data: { keyAttributeOptions: ['int'] } });
    expect(gapsOf(odd)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'subfeatures.keyOptions',
      raw: 'luck',
    });
  });

  test("a feat's keyOptions are still reported, as only a class feature reads them", () => {
    const feat = translate([
      {
        id: 'oddFeat00000001',
        name: 'Odd Feat',
        type: 'feat',
        system: { category: 'general', subfeatures: { keyOptions: ['int'] } },
      },
    ]);

    expect(gapsOf(feat)).toContainEqual({
      reason: KindDataGapReason.UnmappedField,
      field: 'subfeatures.keyOptions',
      raw: ['int'],
    });
  });
});
