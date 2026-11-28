import { ContentKind, ContentRegistry, Trait } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { registryEntries, traitLabel, traitNamesOf } from './entry-lookup';

const VERSATILE = Trait.parse('versatile-p');

function registryOf(...packs: ReadonlyArray<ContentPackBuilder>): ContentRegistry {
  const registry = new ContentRegistry();

  for (const pack of packs) {
    registry.register(pack.build());
  }

  return registry;
}

function packWith(id: string): ContentPackBuilder {
  return new ContentPackBuilder().withId(id).withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS);
}

const official = packWith('player-core').withItem(ContentKind.Trait, 'versatile-p', {
  appliesTo: [ContentKind.Equipment],
});

official.withFeat('power-attack', { traits: ['fighter'] });

const names = traitNamesOf(registryEntries(registryOf(official)));

describe(traitNamesOf, () => {
  it('names each trait by its entry in the vocabulary, and no other kind of entry', () => {
    expect([...names.keys()]).toStrictEqual([VERSATILE]);
  });

  it('takes the name of the last entry loaded for a trait', () => {
    const homebrew = packWith('homebrew').withItem(ContentKind.Trait, 'versatile-p', {
      appliesTo: [ContentKind.Equipment],
    });

    const homebrewName = registryEntries(registryOf(homebrew)).find((entry) => entry.kind === ContentKind.Trait)?.name;
    const both = traitNamesOf(registryEntries(registryOf(official, homebrew)));

    expect(both.get(VERSATILE)).toBe(homebrewName);
  });
});

describe(traitLabel, () => {
  it('is the name the vocabulary gives the trait', () => {
    expect(traitLabel(names, VERSATILE)).toBe('Versatile-p');
  });

  it('reads the slug as words, never the raw slug, for a trait nothing names', () => {
    expect(traitLabel(names, Trait.parse('deadly-d8'))).toBe('Deadly d8');
  });

  it('reads the slug as words while the vocabulary is still loading', () => {
    expect(traitLabel(new Map(), VERSATILE)).toBe('Versatile p');
  });
});
