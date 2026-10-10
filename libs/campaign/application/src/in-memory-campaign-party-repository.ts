import type { CampaignCharacter, CampaignId, CharacterId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { CampaignPartyRepository } from './campaign-party-repository';

/** An attachment and the campaign it is in. */
interface Attached {
  readonly campaignId: CampaignId;
  readonly character: CampaignCharacter;
}

/**
 * Repository adapter for tests and local experiments. It knows no memberships, so a member's
 * characters stay when they leave; the service leaves out characters whose member is gone.
 */
export class InMemoryCampaignPartyRepository extends CampaignPartyRepository {
  readonly #rows = new Map<CharacterId, Attached>();

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignCharacter[]> {
    return [...this.#rows.values()]
      .filter((attached) => attached.campaignId === campaignId)
      .map(({ character }) => character)
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.attachedAt, right.attachedAt) || left.id.localeCompare(right.id),
      );
  }

  public override async campaignsOf(
    characterIds: readonly CharacterId[],
  ): Promise<ReadonlyMap<CharacterId, CampaignId>> {
    return new Map(
      characterIds.flatMap((characterId): [CharacterId, CampaignId][] => {
        const attached = this.#rows.get(characterId);
        return attached === undefined ? [] : [[characterId, attached.campaignId]];
      }),
    );
  }

  public override async attach(campaignId: CampaignId, character: CampaignCharacter): Promise<CampaignId> {
    const existing = this.#rows.get(character.characterId);
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
}
