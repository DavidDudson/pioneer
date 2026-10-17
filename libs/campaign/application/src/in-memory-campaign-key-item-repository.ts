import type { CampaignId, CampaignKeyItem, CharacterId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CampaignKeyItemRepository } from './campaign-key-item-repository';
import type { KeyItemArchival, KeyItemHolder } from './campaign-key-item-repository';

/** `keyItem` held by `holder`. */
function held(keyItem: CampaignKeyItem, holder: CharacterId | undefined): CampaignKeyItem {
  return { ...keyItem, holder };
}

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignKeyItemRepository extends CampaignKeyItemRepository {
  readonly #live = new Map<CampaignId, CampaignKeyItem[]>();
  readonly #archived = new Map<CampaignId, CampaignKeyItem[]>();

  /** The archived key items, with the holder they had, for tests to see the history stays. */
  public archivedOf(campaignId: CampaignId): readonly CampaignKeyItem[] {
    return this.#archived.get(campaignId) ?? [];
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignKeyItem[]> {
    return (this.#live.get(campaignId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.createdAt, right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  public override async insert(_actor: UserId, campaignId: CampaignId, keyItem: CampaignKeyItem): Promise<void> {
    this.#live.set(campaignId, [...(this.#live.get(campaignId) ?? []), keyItem]);
  }

  public override async setHolder(
    _actor: UserId,
    campaignId: CampaignId,
    { id, holder }: KeyItemHolder,
  ): Promise<void> {
    const live = this.#live.get(campaignId) ?? [];
    this.#live.set(
      campaignId,
      live.map((each) => (each.id === id ? held(each, holder) : each)),
    );
  }

  public override async archive(_actor: UserId, campaignId: CampaignId, { id }: KeyItemArchival): Promise<void> {
    const live = this.#live.get(campaignId) ?? [];
    this.#live.set(
      campaignId,
      live.filter((each) => each.id !== id),
    );
    this.#archived.set(campaignId, [
      ...(this.#archived.get(campaignId) ?? []),
      ...live.filter((each) => each.id === id),
    ]);
  }
}
