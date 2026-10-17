import type { CampaignId, FlaggedItem } from '@pioneer/campaign/domain';

import { FlaggedItems } from './flagged-items';

/** Adapter for tests: the items each campaign's party breaks rules with are given up front, and can change. */
export class InMemoryFlaggedItems extends FlaggedItems {
  readonly #flagged = new Map<CampaignId, readonly FlaggedItem[]>();

  /** The campaign's party breaks exactly these rules from now on. */
  public flag(campaignId: CampaignId, items: readonly FlaggedItem[]): this {
    this.#flagged.set(campaignId, items);
    return this;
  }

  public override async of(campaignId: CampaignId): Promise<readonly FlaggedItem[]> {
    return this.#flagged.get(campaignId) ?? [];
  }
}
