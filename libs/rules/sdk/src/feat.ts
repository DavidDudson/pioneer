import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActionData, Skills, Uses } from './action';
import { AttributeBoost } from './attribute';
import { ContentId, Slug } from './content-id';
import { Predicate } from './predicate';
import { RichText } from './rich-text';
import { uniqueItems } from './unique-items';

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

const TAGS_MAX = 16;

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
  /**
   * The prerequisites as a predicate over the character's roll options (`feat:shield-block`,
   * `{ "gte": ["skill:athletics:rank", 1] }`), where their text parses; absent where it doesn't, so they read as
   * unknown, never as met (ADR-0002).
   */
  prerequisitePredicate: Predicate.optional(),
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
  /**
   * The groups it belongs to beyond its traits (Foundry's `otherTags`): `cleric-doctrine` on each doctrine. Each is the
   * roll option `tag:<tag>`, which a subclass's `ChoiceSet` filters on (`item:tag:cleric-doctrine`).
   */
  tags: z.array(Slug).min(1).max(TAGS_MAX).readonly().check(uniqueItems).optional(),
  /**
   * The attributes it adds to its class's key attribute options (Foundry's `subfeatures.keyOptions`): Strength on
   * Ruffian, so a ruffian rogue may key Dexterity or Strength.
   */
  keyAttributeOptions: AttributeBoost.optional(),
});
export type ClassFeatureData = z.infer<typeof ClassFeatureData>;

/**
 * An ancestry feature's `data` on the `ContentEntry` envelope (Keen Eyes, Plant Nourishment). The ancestry or heritage
 * that grants it is the entry holding its `GrantItem`; it is never picked, so no feat slot offers it. What it does is
 * in `rules`.
 */
export const AncestryFeatureData = z.strictObject({
  /** How it is used when the feature is itself an action. */
  action: ActionData.optional(),
});
export type AncestryFeatureData = z.infer<typeof AncestryFeatureData>;
