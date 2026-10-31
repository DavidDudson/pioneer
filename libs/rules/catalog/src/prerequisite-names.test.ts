import { describe, expect, test } from 'bun:test';

import { ContentKind, RollOption } from '@pioneer/rules/sdk';

import { prerequisiteNames } from './prerequisite-names';
import type { NamedEntry } from './prerequisite-names';
import { entry, skill } from './testing/prerequisite-entries';

const named = (kind: ContentKind, option: string): NamedEntry => ({ kind, option: RollOption.parse(option) });

describe('prerequisite names', () => {
  test('index named kinds, and the class features a dedication offers, but other class features not by name, variants by their name without brackets, and ranked statistics', () => {
    const names = prerequisiteNames([
      entry('Shield Block', 'feat', { category: 'general' }),
      entry('Shield Block', 'class-feature', {}),
      entry('Leaf Order', 'class-feature', { tags: ['druid-order'] }),
      entry('Counterspell (Prepared)', 'feat', { category: 'class' }),
      skill('Athletics', 'skill:athletics'),
      skill('Perception', 'perception'),
      skill('Fortitude', 'save:fortitude'),
    ]);

    expect(names.entries.get('shield block')).toStrictEqual([named(ContentKind.Feat, 'feat:shield-block')]);
    expect(names.entries.get('leaf order')).toStrictEqual([named(ContentKind.ClassFeature, 'feature:leaf-order')]);
    expect(names.entries.get('leaf order muse')).toBeUndefined();
    expect(names.entries.get('shield block')).not.toContainEqual(
      named(ContentKind.ClassFeature, 'feature:shield-block'),
    );
    expect(names.variants.get('counterspell')).toStrictEqual([named(ContentKind.Feat, 'feat:counterspell-prepared')]);
    expect(names.statistics).toStrictEqual(
      new Map([
        ['athletics', 'skill:athletics'],
        ['perception', 'perception'],
      ]),
    );
  });
});
