import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActionData, Skills, Uses } from './action';
import { ContentId } from './content-id';
import { RichText } from './rich-text';

/** Which slot a feat fills, as Foundry pf2e files it. An archetype feat is a class feat with the archetype trait. */
export const FeatCategory = {
  Ancestry: 'ancestry',
  Class: 'class',
  General: 'general',
  Skill: 'skill',
  Bonus: 'bonus',
} as const;
export type FeatCategory = ValueOf<typeof FeatCategory>;
const FeatCategorySchema = z.enum(FeatCategory);

/** `maxTakable` for a feat a character can take any number of times (Foundry pf2e stores `null`). */
export const UNLIMITED = 'unlimited';

/**
 * A feat's `data` on the `ContentEntry` envelope. What it does is in `rules`; this is how it is taken and used. Its
 * sheet placement override is the envelope's `display`.
 */
export const FeatData = z.strictObject({
  category: FeatCategorySchema,
  /** As printed ("trained in Athletics; Shield Block"). */
  prerequisites: RichText.optional(),
  /** It can only be taken at 1st level (an ancestry's lineage feats). */
  onlyLevel1: z.boolean().optional(),
  /** How many times a character can take it, or `unlimited` (Additional Lore); absent for once, as in Foundry. */
  maxTakable: z.union([Uses, z.literal(UNLIMITED)]).optional(),
  /** How it is used when it is an action (Sudden Charge); absent for a passive feat. */
  action: ActionData.optional(),
  /** The skills it is about (Assurance in Athletics). An action feat may name more on `action`. */
  skills: Skills.optional(),
  /** The `archetype` entry it belongs to, for a feat with the `archetype` trait (Fighter Dedication). */
  archetype: ContentId.optional(),
});
export type FeatData = z.infer<typeof FeatData>;

/**
 * A class feature's `data` on the `ContentEntry` envelope. Its class is the entry that grants it; what it does is
 * in `rules`.
 */
export const ClassFeatureData = z.strictObject({
  /** How it is used when the feature is itself an action. Most grant an `action` entry instead (Reactive Strike). */
  action: ActionData.optional(),
});
export type ClassFeatureData = z.infer<typeof ClassFeatureData>;
