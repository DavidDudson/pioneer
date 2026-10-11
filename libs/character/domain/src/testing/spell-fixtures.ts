import { contentId, ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import type { SpellContent } from '../spell-content';

/** No spells: prepared slots offer nothing. For tests about other slots. */
export const NO_SPELLS: SpellContent = { spells: [], spell: () => undefined };

const SPELL_PACK = 'spell-fixtures';

/** The fixture spells, each named for the Player Core spell it stands in for. */
export type SpellFixture =
  | 'detect-magic'
  | 'shield'
  | 'force-barrage'
  | 'heal'
  | 'fireball'
  | 'veil-of-privacy'
  | 'wish'
  | 'force-bolt';

/** The id of a spell in `spellFixtures`. */
export function spellFixtureId(name: SpellFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(SPELL_PACK), EntrySlug.parse(`spell:${name}`)));
}

/**
 * A pack of spells covering what a prepared slot reads: cantrips (Detect Magic, Shield), common spells of 1st and 3rd
 * rank of one or two traditions (Force Barrage, Heal, Fireball), an uncommon 3rd-rank spell (Veil of Privacy), a
 * rare 10th-rank one (Wish) and a focus spell (Force Bolt), which never goes in a slot.
 */
export function spellFixtures(): ContentPack {
  const all = ['arcane', 'divine', 'occult', 'primal'];
  return new ContentPackBuilder()
    .withId(SPELL_PACK)
    .withSpell('detect-magic', { rank: 1, traditions: all, traits: ['cantrip'] })
    .withSpell('shield', { rank: 1, traditions: ['arcane', 'divine', 'occult'], traits: ['cantrip'] })
    .withSpell('force-barrage', { rank: 1, traditions: ['arcane', 'occult'] })
    .withSpell('heal', { rank: 1, traditions: ['divine', 'primal'] })
    .withSpell('fireball', { rank: 3, traditions: ['arcane', 'primal'] })
    .withSpell('veil-of-privacy', { rank: 3, traditions: ['arcane', 'occult'], rarity: 'uncommon' })
    .withSpell('wish', { rank: 10, traditions: ['arcane'], rarity: 'rare' })
    .withSpell('force-bolt', { rank: 1, traditions: ['arcane'], traits: ['focus'], rarity: 'uncommon' })
    .build();
}
