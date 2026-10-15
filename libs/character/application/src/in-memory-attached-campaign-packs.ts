import type { CampaignAlly, CharacterId } from '@pioneer/character/domain';

import { AttachedCampaignPacks } from './attached-campaign-packs';
import type { AttachedCampaign } from './attached-campaign-packs';

/** Adapter for tests: which characters are in which campaign is given up front, and can change. */
export class InMemoryAttachedCampaignPacks extends AttachedCampaignPacks {
  readonly #attached = new Map<CharacterId, AttachedCampaign>();
  readonly #allies = new Map<CharacterId, readonly CampaignAlly[]>();

  /**
   * Attach the character to a campaign enabling these packs; attaching it again replaces the campaign. `allies` are the
   * rest of its party.
   */
  public attach(characterId: CharacterId, campaign: AttachedCampaign, allies: readonly CampaignAlly[] = []): this {
    this.#attached.set(characterId, campaign);
    this.#allies.set(characterId, allies);
    return this;
  }

  public detach(characterId: CharacterId): this {
    this.#attached.delete(characterId);
    this.#allies.delete(characterId);
    return this;
  }

  public override async of(characterId: CharacterId): Promise<AttachedCampaign | undefined> {
    return this.#attached.get(characterId);
  }

  public override async alliesOf(characterId: CharacterId): Promise<readonly CampaignAlly[]> {
    return this.#allies.get(characterId) ?? [];
  }
}
