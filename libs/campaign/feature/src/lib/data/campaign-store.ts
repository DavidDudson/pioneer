import { inject, Injectable, signal } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { Campaign, CampaignId, CreateCampaignBody } from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** TanStack Query keys for the campaign feature. */
const campaignKeys = {
  all: ['campaigns'] as const,
  list: () => [...campaignKeys.all, 'list'] as const,
  detail: (id: CampaignId | undefined) => [...campaignKeys.all, 'detail', id] as const,
};

/**
 * Server state for the campaign feature, cached by TanStack Query. The UI owns each command's
 * pending/success/error state (`fr-async-*`). Provided per route.
 */
@Injectable()
export class CampaignStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #selectedId = signal<CampaignId | undefined>(undefined);

  /** Every campaign the user is in, as GM or player. */
  public readonly list = injectQuery(() => ({
    queryKey: campaignKeys.list(),
    queryFn: async (): Promise<Campaign[]> => this.#api.call(CampaignContract.list, { params: {}, body: undefined }),
  }));

  /** The open campaign. */
  public readonly selected = injectQuery(() => {
    const id = this.#selectedId();
    return {
      queryKey: campaignKeys.detail(id),
      queryFn: async (): Promise<Campaign> => {
        if (id === undefined) {
          throw new Error('No campaign selected');
        }
        return this.#api.call(CampaignContract.get, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  public select(id: CampaignId): void {
    this.#selectedId.set(id);
  }

  public async create(body: CreateCampaignBody): Promise<Campaign> {
    const campaign = await this.#api.call(CampaignContract.create, { params: {}, body });
    this.#client.setQueryData(campaignKeys.detail(campaign.id), campaign);
    // Stale, not refetched now: the list refetches when it is next shown, so navigation isn't held up.
    await this.#client.invalidateQueries({ queryKey: campaignKeys.list(), refetchType: 'none' });
    return campaign;
  }
}
