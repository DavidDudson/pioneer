import { ContentKind, ContentRegistry, Trait } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { registryEntries, traitLabel, traitNamesOf } from './entry-lookup';

const pack = new ContentPackBuilder().withId('player-core').withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS);
pack.withItem(ContentKind.Trait, 'versatile-p', { appliesTo: [ContentKind.Equipment] });
const registry = new ContentRegistry();
registry.register(pack.build());
const names = traitNamesOf(registryEntries(registry));

describe(traitNamesOf, () => {
  it('names each trait by its entry in the vocabulary', () => {
    expect([...names.keys()]).toStrictEqual([Trait.parse('versatile-p')]);
  });
});

describe(traitLabel, () => {
  it('is the name the vocabulary gives the trait', () => {
    expect(traitLabel(names, 'versatile-p')).toBe(names.get(Trait.parse('versatile-p')));
  });

  it('reads the slug as words, never the raw slug, for a trait nothing names', () => {
    expect(traitLabel(names, 'deadly-d8')).toBe('Deadly d8');
  });

  it('reads the slug as words while the vocabulary is still loading', () => {
    expect(traitLabel(new Map(), 'versatile-p')).toBe('Versatile p');
  });
});
