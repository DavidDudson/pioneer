import { describe, expect, test } from 'bun:test';

import { ContentKind, Trait } from '@pioneer/rules/sdk';

import { entryOfKind } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { featEffectOf, GIANTS_STATURE, HUMANOID_FORM, MAGIC, spellEffectOf } from './testing/magic-fixtures';
import type { ImportTranslation } from './translate-import';

const POLYMORPH = Trait.parse('polymorph');

function traitsOf(translation: ImportTranslation, name: string): readonly Trait[] | undefined {
  return entryOfKind(translation, ContentKind.Effect, name)?.envelope.traits;
}

describe('withPolymorphTraits: effects of polymorph spells', () => {
  const humanoid = spellEffectOf('9mHwG1tEhU8oLq0b', 'Spell Effect: Humanoid Form');
  const variant = spellEffectOf('Vb2kD7sPq4xYzR1c', 'Spell Effect: Humanoid Form (Elf)');
  const forms = translate([...MAGIC, HUMANOID_FORM, humanoid, variant]);

  test.each(['spell-effect-humanoid-form', 'spell-effect-humanoid-form-elf'])('%s is a polymorph effect', (name) => {
    expect(traitsOf(forms, name)).toEqual([POLYMORPH]);
  });

  test('an effect of a spell without the trait gets none', () => {
    expect(traitsOf(forms, 'spell-effect-bless')).toEqual([]);
  });

  test('an effect keeps no trait when its spell is not in the import', () => {
    expect(traitsOf(translate([humanoid]), 'spell-effect-humanoid-form')).toEqual([]);
  });
});

describe('withPolymorphTraits: effects of polymorph feats', () => {
  const stature = featEffectOf('4tXn8RkVw1QzLm5y', "Effect: Giant's Stature");

  test('an Effect of a polymorph feat is a polymorph effect', () => {
    expect(traitsOf(translate([GIANTS_STATURE, stature]), 'effect-giants-stature')).toEqual([POLYMORPH]);
  });

  test('a feat does not give its trait to a Spell Effect of the same name', () => {
    const spellEffect = spellEffectOf('7yBq2JdNs6HpWc3x', "Spell Effect: Giant's Stature");

    expect(traitsOf(translate([GIANTS_STATURE, spellEffect]), 'spell-effect-giants-stature')).toEqual([]);
  });
});
