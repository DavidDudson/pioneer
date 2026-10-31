import { describe, expect, test } from 'bun:test';

import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL } from './testing/kind-fixtures';

const CLASS_FEATURES = { name: 'classfeatures', directory: 'class-features' };

function classFeature(id: string, name: string, rules: readonly object[]): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    pack: CLASS_FEATURES,
    system: {
      category: 'classfeature',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: 1 },
      rules,
    },
  };
}

const DOCTRINE = (name: string): string => `Compendium.pf2e.classfeatures.Item.${name}`;

/** The Warpriest feature as Foundry writes it: it sets the flag the generic doctrine features read. */
const WARPRIEST = classFeature('wArPrIeSt0000000', 'Warpriest', [
  {
    key: 'ActiveEffectLike',
    mode: 'override',
    path: 'flags.system.cleric',
    value: { firstDoctrine: DOCTRINE('First Doctrine (Warpriest)') },
  },
]);

const FIRST_WARPRIEST = classFeature('fIrStWaRpRiEsT00', 'First Doctrine (Warpriest)', []);
const FIRST_CLOISTERED = classFeature('fIrStClOiStEr000', 'First Doctrine (Cloistered Cleric)', []);

/** The generic First Doctrine feature, which grants whichever doctrine the flag names. */
const FIRST = classFeature('fIrStDoCtRiNe0000', 'First Doctrine', [
  { key: 'GrantItem', uuid: '{actor|flags.system.cleric.firstDoctrine}' },
]);

const DOCUMENTS = [WARPRIEST, FIRST, FIRST_WARPRIEST, FIRST_CLOISTERED];

describe('a cleric’s doctrine', () => {
  test('is granted by the generic feature for each doctrine, while the character has that doctrine', () => {
    const rules = translate(DOCUMENTS).entries.find(
      ({ envelope }) => String(envelope.slug) === 'class-feature:first-doctrine',
    )?.envelope.rules;

    expect(rules).toMatchObject([
      { key: 'GrantItem', item: idOf('class-feature:first-doctrine-warpriest'), predicate: ['feature:warpriest'] },
      {
        key: 'GrantItem',
        item: idOf('class-feature:first-doctrine-cloistered-cleric'),
        predicate: ['feature:cloistered-cleric'],
      },
    ]);
  });

  test('sets no actor flag: the doctrine feature’s own flag is dropped on purpose, not left in the backlog', () => {
    const translation = translate(DOCUMENTS);
    const warpriest = translation.entries.find(({ envelope }) => String(envelope.slug) === 'class-feature:warpriest');

    expect(warpriest?.envelope.rules).toEqual([]);
    expect(translation.envelopes.untranslatedRules).toEqual([]);
  });

  test('grants nothing for a doctrine whose feature is not in the import', () => {
    const translation = translate([FIRST, FIRST_WARPRIEST]);
    const rules = translation.entries.find(({ envelope }) => String(envelope.slug) === 'class-feature:first-doctrine')
      ?.envelope.rules;

    expect(rules).toMatchObject([
      { key: 'GrantItem', item: idOf('class-feature:first-doctrine-warpriest'), predicate: ['feature:warpriest'] },
    ]);
  });
});
