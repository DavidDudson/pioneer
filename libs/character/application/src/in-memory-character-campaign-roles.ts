import type { CharacterId, OverrideRole } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterCampaignRoles } from './character-campaign-roles';

/** Adapter for tests: who is what in a character's campaign is given up front, and can change. */
export class InMemoryCharacterCampaignRoles extends CharacterCampaignRoles {
  readonly #roles = new Map<string, OverrideRole>();

  /** Makes the user `role` in the campaign the character is attached to; saying so again replaces it. */
  public assign(characterId: CharacterId, user: UserId, role: OverrideRole): this {
    this.#roles.set(`${characterId}:${user}`, role);
    return this;
  }

  public override async roleOf(characterId: CharacterId, user: UserId): Promise<OverrideRole | undefined> {
    return this.#roles.get(`${characterId}:${user}`);
  }
}
