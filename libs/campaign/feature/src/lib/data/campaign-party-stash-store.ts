import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { CampaignId, CharacterId, PartyStash, ReviewedItemId } from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

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
  readonly #client = inject(QueryClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #id = computed(() => this.#campaigns.selected.data()?.id);

  /** The open campaign's stash, with the viewer's own characters that may take from it. */
  public readonly stash = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: partyStashKey(id),
      queryFn: async (): Promise<PartyStash> => {
        if (id === undefined) {
          throw new Error('No campaign selected');
        }
        return this.#api.call(CampaignContract.partyStash, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Takes the stash line, and what it holds, into the viewer's character. */
  public async take(to: CharacterId, item: ReviewedItemId): Promise<void> {
    const id = this.#openId();
    await this.#api.call(CampaignContract.takeFromPartyStash, { params: { id }, body: { to, item } });
    await this.#client.invalidateQueries({ queryKey: partyStashKey(id) });
  }

  #openId(): CampaignId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No campaign selected');
    }
    return id;
  }
}
