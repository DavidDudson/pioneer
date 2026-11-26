import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { CampaignId, CharacterId, PartyStash, ReviewedItemId } from '@pioneer/campaign/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's party stash. */
export function partyStashKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'party-stash', id];
}

/**
 * What the party holds in common in the open campaign (ADR-0064), cached by TanStack Query. There is no live stream
 * (ADR-0018): every move reads the stash again, and the query refetches when the window is focused again.
 */
@Injectable()
export class CampaignPartyStashStore {
  readonly #api = inject(ApiClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #stash = injectScopedQuery<CampaignId, PartyStash>({
    id: computed(() => this.#campaigns.selected.data()?.id),
    key: partyStashKey,
    fetch: async (id) => this.#api.call(CampaignContract.partyStash, { params: { id }, body: undefined }),
    missing: 'No campaign selected',
  });

  /** The open campaign's stash, with the viewer's own characters that may take from it. */
  public readonly stash = this.#stash.query;

  /** Takes the stash line, and what it holds, into the viewer's character. */
  public async take(to: CharacterId, item: ReviewedItemId): Promise<void> {
    const id = this.#stash.openId();
    await this.#api.call(CampaignContract.takeFromPartyStash, { params: { id }, body: { to, item } });
    await this.#stash.invalidate(id);
  }
}
