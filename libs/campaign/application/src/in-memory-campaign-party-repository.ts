import type { CampaignCharacter, CampaignId, CharacterId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { CampaignPartyRepository } from './campaign-party-repository';
import type { CampaignRepository } from './campaign-repository';

/** An attachment and the campaign it is in. */
interface Attached {
  readonly campaignId: CampaignId;
  readonly character: CampaignCharacter;
}

/**
 * Repository adapter for tests and local experiments. It reads memberships from `campaigns`, so a
 * character leaves with its member, as the database's cascade does.
 */
export class InMemoryCampaignPartyRepository extends CampaignPartyRepository {
  readonly #campaigns: CampaignRepository;
  readonly #rows = new Map<CharacterId, Attached>();

  public constructor(campaigns: CampaignRepository) {
    super();
    this.#campaigns = campaigns;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignCharacter[]> {
    const rows = await this.#current();
    return rows
      .filter((attached) => attached.campaignId === campaignId)
      .map(({ character }) => character)
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.attachedAt, right.attachedAt) || left.id.localeCompare(right.id),
      );
  }

  public override async campaignsOf(
    characterIds: readonly CharacterId[],
  ): Promise<ReadonlyMap<CharacterId, CampaignId>> {
    const rows = await this.#current();
    const placed = new Map(rows.map((attached) => [attached.character.characterId, attached.campaignId]));
    return new Map(
      characterIds.flatMap((characterId): [CharacterId, CampaignId][] => {
        const campaignId = placed.get(characterId);
        return campaignId === undefined ? [] : [[characterId, campaignId]];
      }),
    );
  }

  public override async attach(campaignId: CampaignId, character: CampaignCharacter): Promise<CampaignId | undefined> {
    const campaign = await this.#campaigns.findById(campaignId);
    if (campaign?.memberById(character.memberId) === undefined) {
      return undefined;
    }
    const rows = await this.#current();
    const existing = rows.find((attached) => attached.character.characterId === character.characterId);
    if (existing !== undefined) {
      return existing.campaignId;
    }
    this.#rows.set(character.characterId, { campaignId, character });
    return campaignId;
  }

  public override async detach(campaignId: CampaignId, characterId: CharacterId): Promise<void> {
    if (this.#rows.get(characterId)?.campaignId === campaignId) {
      this.#rows.delete(characterId);
    }
  }

  /** The attachments whose member is still in their campaign; the rest are dropped, like a cascade. */
  async #current(): Promise<readonly Attached[]> {
    const rows = [...this.#rows.values()];
    const campaigns = await Promise.all(rows.map(async (attached) => this.#campaigns.findById(attached.campaignId)));
    return rows.filter((attached, index) => {
      const kept = campaigns[index]?.memberById(attached.character.memberId) !== undefined;
      if (!kept) {
        this.#rows.delete(attached.character.characterId);
      }
      return kept;
    });
  }
}
