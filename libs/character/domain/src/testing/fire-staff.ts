import { ContentId, contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

import { ITEM_PACK } from './condition-fixture-ids';

const FIRE_STAFF_LEVEL = 3;

/** The id of the spell `slug` the fixture staff holds. */
export function staffSpellId(slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`spell:${slug}`)));
}

/** A magic staff: Ignition, Breathe Fire at 1st rank, Floating Flame and Fireball at 3rd. */
/** The spells the fire staff holds, as the packs would give them: Ignition is arcane only, the rest arcane and primal. */
export const FIRE_STAFF_SPELLS = {
  ignition: { rank: 1, traditions: ['arcane'], traits: ['cantrip'] },
  'breathe-fire': { rank: 1, traditions: ['arcane', 'primal'] },
  'floating-flame': { rank: 3, traditions: ['arcane', 'primal'] },
  fireball: { rank: 3, traditions: ['arcane', 'primal'] },
} as const;

export const FIRE_STAFF: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Weapon,
  level: FIRE_STAFF_LEVEL,
  data: {
    bulk: 1,
    category: 'simple',
    group: 'club',
    damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
    usage: { type: 'held', hands: 'one' },
    staff: [
      { rank: 'cantrip', spells: [staffSpellId('ignition')] },
      { rank: 1, spells: [staffSpellId('breathe-fire')] },
      { rank: 3, spells: [staffSpellId('floating-flame'), staffSpellId('fireball')] },
    ],
  },
  traits: ['magical', 'staff'],
};

const FIREBALL_WAND_LEVEL = 5;
const FIREBALL_RANK = 3;

/** A wand of Fireball (3rd rank): cast once a day, and kept when spent. */
export const FIREBALL_WAND: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Consumable,
  level: FIREBALL_WAND_LEVEL,
  data: {
    bulk: 'light',
    category: 'wand',
    kept: true,
    spell: { spell: staffSpellId('fireball'), rank: FIREBALL_RANK },
    usage: { type: 'held', hands: 'one' },
  },
  traits: ['magical', 'wand'],
};

/** A scroll of Fireball (3rd rank): the spell cast once, and the scroll gone. */
export const FIREBALL_SCROLL: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Consumable,
  level: FIREBALL_WAND_LEVEL,
  data: {
    bulk: 'light',
    category: 'scroll',
    spell: { spell: staffSpellId('fireball'), rank: FIREBALL_RANK },
  },
  traits: ['magical', 'scroll'],
};

/** The staff, wand and scroll fixtures by the item fixture they are. */
export const FIRE_ITEMS = {
  'fire-staff': FIRE_STAFF,
  'fireball-wand': FIREBALL_WAND,
  'fireball-scroll': FIREBALL_SCROLL,
} as const;
