import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { RulesMessage } from './messages';
import { RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';
import { MagicTraditionSchema } from './spellcasting-tradition';
import { SOURCE_SLUG_MAX } from './statistic';

/** How an entry's spells are cast: prepared each day, from a repertoire, or innate. */
export const SpellPreparation = {
  Prepared: 'prepared',
  Spontaneous: 'spontaneous',
  Innate: 'innate',
} as const;
export type SpellPreparation = ValueOf<typeof SpellPreparation>;
const SpellPreparationSchema = z.enum(SpellPreparation);

/** An entry's slug, short enough that its `spell-attack:<slug>` and `spell-dc:<slug>` stay selectors. */
const EntrySourceSlug = RuleSlug.refine(
  (slug) => slug.length <= SOURCE_SLUG_MAX,
  issueParams(message(RulesMessage.SpellcastingSlugLength, { maximum: SOURCE_SLUG_MAX })),
);

/**
 * Gives the character a spellcasting entry: a tradition, the attribute its spell attack and DC read, and how its
 * spells are prepared. Each entry in play has its own `spell-attack:<slug>` and `spell-dc:<slug>`, and makes the
 * character trained in `spellcasting`, the one rank every entry reads; a `Proficiency` element raises it further. Two in play with
 * one slug are one entry. A Pioneer element with no Foundry counterpart: Foundry's spellcasting entries are items the
 * player adds by hand (ADR-0040).
 */
export const SpellcastingEntryElement = z.strictObject({
  key: z.literal(RuleElementKey.SpellcastingEntry),
  slug: EntrySourceSlug,
  tradition: MagicTraditionSchema,
  attribute: AttributeSchema,
  preparation: SpellPreparationSchema,
  ...ruleElementBase,
});
export type SpellcastingEntryElement = z.infer<typeof SpellcastingEntryElement>;
