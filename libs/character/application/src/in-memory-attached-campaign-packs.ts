import type { CharacterId } from '@pioneer/character/domain';

import { AttachedCampaignPacks } from './attached-campaign-packs';
import type { AttachedCampaign } from './attached-campaign-packs';

/** Adapter for tests: which characters are in which campaign is given up front, and can change. */
export class InMemoryAttachedCampaignPacks extends AttachedCampaignPacks {
  readonly #attached = new Map<CharacterId, AttachedCampaign>();

  /** Attach the character to a campaign enabling these packs; attaching it again replaces the campaign. */
  public attach(characterId: CharacterId, campaign: AttachedCampaign): this {
    this.#attached.set(characterId, campaign);
    return this;
  }

  public detach(characterId: CharacterId): this {
    this.#attached.delete(characterId);
    return this;
  }

  public override async of(characterId: CharacterId): Promise<AttachedCampaign | undefined> {
    return this.#attached.get(characterId);
  }
}
