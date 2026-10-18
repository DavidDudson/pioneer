import type {
  CampaignKeyItem,
  CharacterId,
  KeyItemBase,
  KeyItemId,
  KeyItemName,
  KeyItemRunes,
  ReviewedItemId,
} from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** An inventory line as a key item copies it, and the key item it already is the holder copy of, if any. */
export interface LineToPromote {
  readonly name: KeyItemName;
  readonly base: KeyItemBase;
  readonly runes: KeyItemRunes;
  readonly keyItem: KeyItemId | undefined;
}

/** A character's inventory line, and the key item it becomes the holder copy of. */
export interface LineLink {
  readonly item: ReviewedItemId;
  readonly keyItem: KeyItemId;
}

/**
 * Port to the character context for the inventory lines key items put in characters' hands. That context owns the
 * characters, so the adapter lives in the composition root; `InMemoryKeyItemHolders` is for tests.
 */
export abstract class KeyItemHolders {
  /** Adds the key item's line to the character's inventory; one it already has is left as it is. */
  public abstract give(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void>;

  /** Removes the key item's line from the character's inventory; one it does not have is no change. */
  public abstract takeBack(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void>;

  /** What a key item copies from the character's line; none when the character or the line is gone. */
  public abstract describe(character: CharacterId, item: ReviewedItemId): Promise<LineToPromote | undefined>;

  /**
   * Links a line the character already has to the key item, adding no line. A line already linked to it is no change;
   * one linked to another key item is a conflict, and one that is gone a 404.
   */
  public abstract link(actor: UserId, character: CharacterId, line: LineLink): Promise<void>;
}
