import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EnabledVariantRuleId, PackTitle, VariantRuleName } from './campaign-fields';
import type { CampaignVariantRuleId } from './campaign-fields';

/** A variant rule a campaign has enabled. */
export interface CampaignVariantRule {
  readonly id: CampaignVariantRuleId;
  readonly variantId: EnabledVariantRuleId;
  /** The GM who enabled it; absent once their account is deleted. */
  readonly enabledBy: UserId | undefined;
  readonly enabledAt: Temporal.Instant;
}

/** A variant rule as the campaign's list names it, and the pack that defines it. */
export const VariantRuleOption = z.object({
  variantId: EnabledVariantRuleId,
  name: VariantRuleName,
  packTitle: PackTitle,
});
export type VariantRuleOption = z.output<typeof VariantRuleOption>;

/** JSON shape of a campaign's variant rules, as one of its members sees them. */
export const CampaignVariantRules = z.object({
  /** Whether the viewer may enable and disable variant rules: the GM. */
  manageable: z.boolean(),
  /** The variant rules in force, by name. */
  enabled: z.array(VariantRuleOption).readonly(),
  /** The variant rules of the packs the campaign uses that are not enabled, by name. Empty for a player. */
  available: z.array(VariantRuleOption).readonly(),
});
export type CampaignVariantRules = z.output<typeof CampaignVariantRules>;

/** Which variant rule the GM enables. */
export const EnableVariantRuleBody = z.object({ variantId: EnabledVariantRuleId });
export type EnableVariantRuleBody = z.infer<typeof EnableVariantRuleBody>;
