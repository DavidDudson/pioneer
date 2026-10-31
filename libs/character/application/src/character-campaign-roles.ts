import type { CharacterId, OverrideRole } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to the campaign a character is attached to, for what a user is there. The campaign context owns membership,
 * and the character context may not import it, so the adapter lives in the composition root.
 * `InMemoryCharacterCampaignRoles` is for tests.
 */
export abstract class CharacterCampaignRoles {
  /** The user's role in the campaign the character is attached to; none when it is in no campaign or they are no member. */
  public abstract roleOf(characterId: CharacterId, user: UserId): Promise<OverrideRole | undefined>;
}
