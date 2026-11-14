import { ContentKind, ContentRegistry, Trait } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { traitChips } from './sheet-build';

const COLD_IRON = Trait.parse('cold-iron');
const UNLISTED = Trait.parse('unlisted');

const pack = new ContentPackBuilder().withId('player-core').withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS);
pack.withItem(ContentKind.Trait, 'cold-iron', { appliesTo: [ContentKind.Equipment] });
const registry = new ContentRegistry();
registry.register(pack.build());

describe(traitChips, () => {
  it('carries the slug, which opens the card, and the name the vocabulary gives it', () => {
    expect(traitChips(registry, [COLD_IRON])).toStrictEqual([{ label: 'Cold-iron', trait: COLD_IRON }]);
  });

  it('labels a trait the vocabulary does not name with its slug, still a chip that carries it', () => {
    expect(traitChips(registry, [UNLISTED])).toStrictEqual([{ label: UNLISTED, trait: UNLISTED }]);
  });

  it('keeps the order of the traits it is given', () => {
    expect(traitChips(registry, [UNLISTED, COLD_IRON]).map(({ trait }) => trait)).toStrictEqual([UNLISTED, COLD_IRON]);
  });
});
