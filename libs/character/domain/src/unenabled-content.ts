import { ContentId, ContentPackId, ContentText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { AttachedCampaignName, PackPublisher, PackTitle } from './character-packs';
import { VariantRuleOption } from './character-variant-rules';

/** A homebrew pack the character uses that its campaign has not enabled. */
export const UnenabledPack = z.object({
  packId: ContentPackId,
  title: PackTitle,
  publisher: PackPublisher,
});
export type UnenabledPack = z.output<typeof UnenabledPack>;

/** An item the character carries from a pack its campaign has not enabled. */
export const UnenabledItem = z.object({
  item: ContentId,
  name: ContentText,
  packTitle: PackTitle,
});
export type UnenabledItem = z.output<typeof UnenabledItem>;

/**
 * JSON shape of what a character uses that its campaign has not enabled, which is a warning and never a ban. Empty
 * while the character is in no campaign, since then nothing decides against it.
 */
export const UnenabledContent = z.object({
  /** The campaign that has not enabled it; absent when the character is in none. */
  campaign: AttachedCampaignName.optional(),
  /** The variant rules the character has enabled for itself that the campaign has not, by name. */
  variantRules: z.array(VariantRuleOption).readonly(),
  /** The homebrew packs the character uses that the campaign has not enabled, by title. */
  packs: z.array(UnenabledPack).readonly(),
  /** The items the character carries from those packs, by name. */
  items: z.array(UnenabledItem).readonly(),
});
export type UnenabledContent = z.output<typeof UnenabledContent>;
