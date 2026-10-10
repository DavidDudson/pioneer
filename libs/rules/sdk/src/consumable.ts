import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Uses } from './action';
import { ContentId } from './content-id';
import { DamageTypeSchema } from './damage';
import { DamageFormula } from './damage-formula';
import { RulesMessage } from './messages';
import { physicalFields, Usage } from './physical-item';
import { DamageKind } from './spell';
import { SpellRank } from './spell-rank';
import { uniqueItems } from './unique-items';
import { AmmunitionType } from './weapon';

/** What a consumable is, as Foundry pf2e sorts them; `ammunition` is Foundry's `ammo` item type. */
export const ConsumableCategory = {
  Ammunition: 'ammunition',
  Catalyst: 'catalyst',
  Drug: 'drug',
  Elixir: 'elixir',
  Fulu: 'fulu',
  Gadget: 'gadget',
  Mutagen: 'mutagen',
  Oil: 'oil',
  Other: 'other',
  Poison: 'poison',
  Potion: 'potion',
  Scroll: 'scroll',
  Snare: 'snare',
  Talisman: 'talisman',
  Toolkit: 'toolkit',
  Wand: 'wand',
} as const;
export type ConsumableCategory = ValueOf<typeof ConsumableCategory>;

/** The damage or healing using it rolls ("1d8 vitality healing", a minor healing potion). */
const ConsumableDamage = z.strictObject({
  formula: DamageFormula,
  damageType: DamageTypeSchema,
  kind: z.enum(DamageKind),
});

/** The spell a scroll or wand holds, at the rank it casts it. */
const ConsumableSpell = z.strictObject({ spell: ContentId, rank: SpellRank });

const AMMUNITION_TYPES_MAX = 8;

/**
 * A consumable's `data` on the `ContentEntry` envelope, ammunition included. `uses` is how many times it can be used
 * before it is gone, once when absent. Ammunition names the kinds it can be fired as (`arrows`, `bolts`).
 */
export const ConsumableData = z
  .strictObject({
    ...physicalFields,
    category: z.enum(ConsumableCategory),
    uses: Uses.optional(),
    damage: ConsumableDamage.optional(),
    spell: ConsumableSpell.optional(),
    ammunition: z.array(AmmunitionType).min(1).max(AMMUNITION_TYPES_MAX).readonly().check(uniqueItems).optional(),
    usage: Usage.optional(),
  })
  .refine(({ category, ammunition }) => ammunition === undefined || category === ConsumableCategory.Ammunition, {
    ...issueParams(message(RulesMessage.ConsumableAmmunition)),
    path: ['ammunition'],
  });
export type ConsumableData = z.infer<typeof ConsumableData>;
