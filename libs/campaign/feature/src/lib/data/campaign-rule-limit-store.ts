import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignRuleLimits, RuleLimitKey, RuleLimitValue } from '@pioneer/campaign/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's table limits. */
function ruleLimitsKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'rule-limits', id];
}

/**
 * The table limits of the open campaign, cached by TanStack Query apart from the campaign: changing a limit never
 * changes the campaign's version. Every member reads them; the GM sets and resets them (ADR-0064).
 */
@Injectable()
export class CampaignRuleLimitStore {
  readonly #api = inject(ApiClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #limits = injectScopedQuery<CampaignId, CampaignRuleLimits>({
    id: computed(() => this.#campaigns.selected.data()?.id),
    key: ruleLimitsKey,
    fetch: async (id) => this.#api.call(CampaignContract.ruleLimits, { params: { id }, body: undefined }),
    missing: 'No campaign selected',
  });

  /** The open campaign's limits, each with the number in force. */
  public readonly limits = this.#limits.query;

  /** Sets one limit of the open campaign. */
  public async set(limit: RuleLimitKey, value: RuleLimitValue): Promise<void> {
    const id = this.#limits.openId();
    const limits = await this.#api.call(CampaignContract.setRuleLimit, { params: { id, limit }, body: { value } });
    await this.#limits.replace(id, limits);
  }

  /** Returns one limit of the open campaign to the core rules' number. */
  public async reset(limit: RuleLimitKey): Promise<void> {
    const id = this.#limits.openId();
    const limits = await this.#api.call(CampaignContract.resetRuleLimit, { params: { id, limit }, body: undefined });
    await this.#limits.replace(id, limits);
  }
}
