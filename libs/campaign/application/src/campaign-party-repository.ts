import type { CampaignCharacter, CampaignId, CharacterId } from '@pioneer/campaign/domain';

/**
 * Port for the characters attached to campaigns. Adapters live in `campaign-infrastructure`;
 * `InMemoryCampaignPartyRepository` is for tests.
 */
export abstract class CampaignPartyRepository {
  /** The campaign's characters, oldest attachment first; id breaks ties. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignCharacter[]>;

  /** The campaign each of these characters is in; characters in none are left out. */
  public abstract campaignsOf(characterIds: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, CampaignId>>;

  /**
   * Attach the character to the campaign unless it is already in one, as one step with checking its
   * member is still in the campaign, so a removal that commits first stops it. Returns the campaign the
   * character is in afterwards, which is another one when it was already there; undefined when the
   * member is gone. A character leaves with its member.
   */
  public abstract attach(campaignId: CampaignId, character: CampaignCharacter): Promise<CampaignId | undefined>;

  /** Take the character out of the campaign; nothing happens when it is not in it. */
  public abstract detach(campaignId: CampaignId, characterId: CharacterId): Promise<void>;
}
