import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 * `class-feature` and `feat` are named ahead of their schemas (#230) so a
 * `ChoiceSet` query can ask for them.
 */
export const ContentKind = {
  Ancestry: 'ancestry',
  ClassFeature: 'class-feature',
  Creature: 'creature',
  Feat: 'feat',
  Statistic: 'statistic',
} as const;
export type ContentKind = ValueOf<typeof ContentKind>;
export const ContentKindSchema = z.enum(ContentKind);
