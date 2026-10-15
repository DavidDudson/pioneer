import { contentId, ContentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

import { ITEM_PACK } from './condition-fixture-ids';

const FIRE_STAFF_LEVEL = 3;

/** The id of the spell `slug` the fixture staff holds. */
export function staffSpellId(slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`spell:${slug}`)));
}

/** A magic staff: Ignition, Breathe Fire at 1st rank, Floating Flame and Fireball at 3rd. */
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
