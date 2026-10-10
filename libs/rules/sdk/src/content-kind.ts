import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 * Build and play kinds (`class`, `feat`, `effect` and the rest) are named ahead
 * of their schemas (#230, #231), so a `ChoiceSet` query can ask for them and
 * grant resolution can derive the roll options they set (`class:fighter`,
 * `self:condition:grabbed`).
 */
export const ContentKind = {
  Action: 'action',
  Ancestry: 'ancestry',
  Background: 'background',
  Class: 'class',
  ClassFeature: 'class-feature',
  Condition: 'condition',
  Creature: 'creature',
  DamageType: 'damage-type',
  Effect: 'effect',
  Feat: 'feat',
  Heritage: 'heritage',
  Language: 'language',
  Sense: 'sense',
  Statistic: 'statistic',
  Trait: 'trait',
  VariantRule: 'variant-rule',
} as const;
export type ContentKind = ValueOf<typeof ContentKind>;
export const ContentKindSchema = z.enum(ContentKind);
