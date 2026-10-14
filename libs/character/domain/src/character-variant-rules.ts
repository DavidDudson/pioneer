import { ContentText, VariantRuleId } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttachedCampaignName, PackAuthoritySchema, PackTitle } from './character-packs';

/** Row id of one variant rule a character has enabled; the audit log keys every row by an `id`. */
export const CharacterVariantRuleId = Uuid.brand<'CharacterVariantRuleId'>();
export type CharacterVariantRuleId = z.infer<typeof CharacterVariantRuleId>;

/** A variant rule a character has enabled. */
export interface CharacterVariantRule {
  readonly id: CharacterVariantRuleId;
  readonly variantId: VariantRuleId;
  /** The owner who enabled it; absent once their account is deleted. */
  readonly enabledBy: UserId | undefined;
  readonly enabledAt: Temporal.Instant;
}

/** A variant rule as the character's list names it, and the pack that defines it. */
export const VariantRuleOption = z.object({
  variantId: VariantRuleId,
  name: ContentText,
  packTitle: PackTitle,
});
export type VariantRuleOption = z.output<typeof VariantRuleOption>;

/** JSON shape of a character's variant rules: the ones in force, the ones it could enable, and who decides. */
export const CharacterVariantRules = z.object({
  decidedBy: PackAuthoritySchema,
  /** The campaign that decides, when one does. */
  campaign: AttachedCampaignName.optional(),
  /** Whether the viewer may enable and disable variant rules: the owner, while no campaign decides. */
  manageable: z.boolean(),
  /** The variant rules in force, by name. */
  enabled: z.array(VariantRuleOption).readonly(),
  /** The variant rules of the packs in force that are not enabled, by name. Empty while a campaign decides. */
  available: z.array(VariantRuleOption).readonly(),
});
export type CharacterVariantRules = z.output<typeof CharacterVariantRules>;

/** Which variant rule the owner enables. */
export const EnableVariantRuleBody = z.object({ variantId: VariantRuleId });
export type EnableVariantRuleBody = z.infer<typeof EnableVariantRuleBody>;
