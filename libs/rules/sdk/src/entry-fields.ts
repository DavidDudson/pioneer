import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AonUrl } from './source-ref';

export const Rarity = { Common: 'common', Uncommon: 'uncommon', Rare: 'rare', Unique: 'unique' } as const;
export type Rarity = ValueOf<typeof Rarity>;
export const RaritySchema = z.enum(Rarity);

/** How a feat shows on the sheet when its rule elements alone would place it wrong (play-and-campaigns.md). */
export const DisplayCategory = {
  Active: 'active',
  Modifier: 'modifier',
  GrantOnly: 'grant-only',
  Narrative: 'narrative',
} as const;
export type DisplayCategory = ValueOf<typeof DisplayCategory>;
export const DisplayCategorySchema = z.enum(DisplayCategory);

/** Content's overrides of how the app would show an entry. */
export const DisplayHints = z.strictObject({ category: DisplayCategorySchema.optional() });
export type DisplayHints = z.infer<typeof DisplayHints>;

const EXTERNAL_ID_LENGTH_MAX = 200;

/** An entry's id in another tool: a Foundry compendium UUID, Pathbuilder's name for it. Never parsed, only matched. */
export const ExternalId = z.string().min(1).max(EXTERNAL_ID_LENGTH_MAX).brand<'ExternalId'>();
export type ExternalId = z.infer<typeof ExternalId>;

/** Where the entry lives elsewhere; `foundry` is what makes Foundry export possible. */
export const ExternalIds = z.strictObject({
  foundry: ExternalId.optional(),
  aon: AonUrl.optional(),
  pathbuilder: ExternalId.optional(),
});
