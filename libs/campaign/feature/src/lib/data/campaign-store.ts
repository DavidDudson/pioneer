import { computed, inject, Injectable, signal } from '@angular/core';
import { CampaignContract, CampaignId, CampaignRole } from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignInviteId,
  CampaignRoster,
  CreateCampaignBody,
  InviteSummary,
  InviteToken,
  IssuedInvite,
} from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** TanStack Query keys for the campaign feature. */
const campaignKeys = {
  all: ['campaigns'] as const,
  list: () => [...campaignKeys.all, 'list'] as const,
  detail: (id: string | undefined) => [...campaignKeys.all, 'detail', id] as const,
  roster: (id: string | undefined) => [...campaignKeys.all, 'roster', id] as const,
  invites: (id: string | undefined) => [...campaignKeys.all, 'invites', id] as const,
};

/** The route's campaign id, parsed; a malformed one fails the query that asked. */
function parsedId(id: string | undefined): CampaignId {
  if (id === undefined) {
    throw new Error('No campaign selected');
  }
  return CampaignId.parse(id);
}

/**
 * Server state for the campaign feature, cached by TanStack Query. The UI owns each command's
 * pending/success/error state (`fr-async-*`). Provided per route.
 */
@Injectable()
export class CampaignStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  /** The route's id as given; parsed by the query, so a malformed one is a failed load, not a thrown binding. */
  readonly #selectedId = signal<string | undefined>(undefined);

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
      queryFn: async (): Promise<Campaign> =>
        this.#api.call(CampaignContract.get, { params: { id: parsedId(id) }, body: undefined }),
      enabled: id !== undefined,
    };
  });

  /** The open campaign's members with their names, and the user's role in it. */
  public readonly roster = injectQuery(() => {
    const id = this.#selectedId();
    return {
      queryKey: campaignKeys.roster(id),
      queryFn: async (): Promise<CampaignRoster> =>
        this.#api.call(CampaignContract.roster, { params: { id: parsedId(id) }, body: undefined }),
      enabled: id !== undefined,
    };
  });

  /** True once the roster says the user runs the open campaign. */
  public readonly isGm = computed(() => this.roster.data()?.viewerRole === CampaignRole.Gm);

  /** The open campaign's working invites; only its GM may see them, so it waits for the roster. */
  public readonly invites = injectQuery(() => {
    const id = this.#selectedId();
    return {
      queryKey: campaignKeys.invites(id),
      queryFn: async (): Promise<InviteSummary[]> =>
        this.#api.call(CampaignContract.invites, { params: { id: parsedId(id) }, body: undefined }),
      enabled: id !== undefined && this.isGm(),
    };
  });

  public select(id: string): void {
    this.#selectedId.set(id);
  }

  public async create(body: CreateCampaignBody): Promise<Campaign> {
    const campaign = await this.#api.call(CampaignContract.create, { params: {}, body });
    this.#client.setQueryData(campaignKeys.detail(campaign.id), campaign);
    // Stale, not refetched now: the list refetches when it is next shown, so navigation isn't held up.
    await this.#client.invalidateQueries({ queryKey: campaignKeys.list(), refetchType: 'none' });
    return campaign;
  }

  /** A new invite to the open campaign. Its token is in the result and nowhere else. */
  public async createInvite(id: CampaignId): Promise<IssuedInvite> {
    const issued = await this.#api.call(CampaignContract.createInvite, { params: { id }, body: undefined });
    this.#client.setQueryData(campaignKeys.invites(id), (invites: InviteSummary[] | undefined) => [
      issued.invite,
      ...(invites ?? []),
    ]);
    return issued;
  }

  public async revokeInvite(id: CampaignId, inviteId: CampaignInviteId): Promise<void> {
    await this.#api.call(CampaignContract.revokeInvite, { params: { id, inviteId }, body: undefined });
    this.#client.setQueryData(campaignKeys.invites(id), (invites: InviteSummary[] | undefined) =>
      (invites ?? []).filter((invite) => invite.id !== inviteId),
    );
  }

  /** Joins the campaign an invite belongs to; the user's list and its roster are stale after. */
  public async join(token: InviteToken): Promise<Campaign> {
    const campaign = await this.#api.call(CampaignContract.join, { params: {}, body: { token } });
    this.#client.setQueryData(campaignKeys.detail(campaign.id), campaign);
    await this.#client.invalidateQueries({ queryKey: campaignKeys.list(), refetchType: 'none' });
    await this.#client.invalidateQueries({ queryKey: campaignKeys.roster(campaign.id), refetchType: 'none' });
    return campaign;
  }
}
