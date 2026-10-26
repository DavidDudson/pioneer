import { describe, expect, test } from 'bun:test';

import { ContentKind, Trait } from '@pioneer/rules/sdk';

import { entryOfKind } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { HUMANOID_FORM, MAGIC, spellEffectOf } from './testing/magic-fixtures';

const POLYMORPH = Trait.parse('polymorph');

describe('withPolymorphTraits: effects of polymorph spells', () => {
  const humanoid = spellEffectOf('9mHwG1tEhU8oLq0b', 'Spell Effect: Humanoid Form');
  const variant = spellEffectOf('Vb2kD7sPq4xYzR1c', 'Spell Effect: Humanoid Form (Elf)');
  const forms = translate([...MAGIC, HUMANOID_FORM, humanoid, variant]);

  test.each(['spell-effect-humanoid-form', 'spell-effect-humanoid-form-elf'])('%s is a polymorph effect', (name) => {
    expect(entryOfKind(forms, ContentKind.Effect, name)?.envelope.traits).toEqual([POLYMORPH]);
  });

  test('an effect of a spell without the trait gets none', () => {
    expect(entryOfKind(forms, ContentKind.Effect, 'spell-effect-bless')?.envelope.traits).toEqual([]);
  });

  test('an effect keeps no trait when its spell is not in the import', () => {
    const alone = translate([humanoid]);

    expect(entryOfKind(alone, ContentKind.Effect, 'spell-effect-humanoid-form')?.envelope.traits).toEqual([]);
  });
});
