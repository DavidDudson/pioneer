import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 * Every kind but `ancestry`, `creature` and `statistic` is named ahead of its
 * schema (#230), so a `ChoiceSet` query can ask for it and grant resolution can
 * derive the roll options it sets (`class:fighter`, `self:condition:grabbed`).
 */
export const ContentKind = {
  Ancestry: 'ancestry',
  Background: 'background',
  Class: 'class',
  ClassFeature: 'class-feature',
  Condition: 'condition',
  Creature: 'creature',
  Effect: 'effect',
  Feat: 'feat',
  Heritage: 'heritage',
  Statistic: 'statistic',
} as const;
export type ContentKind = ValueOf<typeof ContentKind>;
export const ContentKindSchema = z.enum(ContentKind);
