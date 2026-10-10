import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 * Play kinds (`effect`) are named ahead of their schemas (#231), so a
 * `ChoiceSet` query can ask for them and grant resolution can derive the roll
 * options they set (`self:effect:rage`).
 */
export const ContentKind = {
  Action: 'action',
  Ancestry: 'ancestry',
  Archetype: 'archetype',
  Background: 'background',
  Class: 'class',
  ClassFeature: 'class-feature',
  Condition: 'condition',
  Creature: 'creature',
  DamageType: 'damage-type',
  Deity: 'deity',
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
