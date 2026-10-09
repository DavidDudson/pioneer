import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * Kinds of rules content a pack can contribute. The SDK owns the schema for
 * each kind; packs only supply data. Add a kind here, then its schema module.
 */
export const ContentKind = {
  Ancestry: 'ancestry',
  Creature: 'creature',
  Statistic: 'statistic',
} as const;
export type ContentKind = ValueOf<typeof ContentKind>;
export const ContentKindSchema = z.enum(ContentKind);
