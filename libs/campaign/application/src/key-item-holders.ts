import type { CampaignKeyItem, CharacterId } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to the character context for the inventory lines key items put in characters' hands. That context owns the
 * characters, so the adapter lives in the composition root; `InMemoryKeyItemHolders` is for tests.
 */
export abstract class KeyItemHolders {
  /** Adds the key item's line to the character's inventory; one it already has is left as it is. */
  public abstract give(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void>;

  /** Removes the key item's line from the character's inventory; one it does not have is no change. */
  public abstract takeBack(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void>;
}
