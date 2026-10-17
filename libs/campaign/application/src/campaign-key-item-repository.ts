import type { CampaignId, CampaignKeyItem, CharacterId, KeyItemId } from '@pioneer/campaign/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** Who holds a key item from now on: a character, or the party stash when none. */
export interface KeyItemHolder {
  readonly id: KeyItemId;
  readonly holder: CharacterId | undefined;
}

/** The key item to archive, and when. */
export interface KeyItemArchival {
  readonly id: KeyItemId;
  readonly at: Temporal.Instant;
}

/**
 * Port for a campaign's key items. An archived key item is kept, never deleted (ADR-0062), and every read skips it.
 * Adapters live in `campaign-infrastructure`; the in-memory one is for tests.
 */
export abstract class CampaignKeyItemRepository {
  /** The campaign's live key items, oldest first; id breaks ties. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignKeyItem[]>;

  public abstract insert(actor: UserId, campaignId: CampaignId, keyItem: CampaignKeyItem): Promise<void>;

  /** Move the live key item to its new holder; nothing happens when the campaign has no live key item with that id. */
  public abstract setHolder(actor: UserId, campaignId: CampaignId, holder: KeyItemHolder): Promise<void>;

  /** Archive the key item, keeping who held it; nothing happens when the campaign has no live key item with that id. */
  public abstract archive(actor: UserId, campaignId: CampaignId, archival: KeyItemArchival): Promise<void>;
}
