import type { CampaignId, FlaggedItem } from '@pioneer/campaign/domain';

/**
 * Port to the rules the characters of a campaign's party break (ADR-0064). The character context owns inventories and
 * the campaign context may not import it, so the adapter lives in the composition root. Nothing derived is stored:
 * the answer is worked out on every read. `InMemoryFlaggedItems` is for tests.
 */
export abstract class FlaggedItems {
  /** Every item of the party that breaks a rule, one entry per item and rule, approved or not. */
  public abstract of(campaignId: CampaignId): Promise<readonly FlaggedItem[]>;
}
