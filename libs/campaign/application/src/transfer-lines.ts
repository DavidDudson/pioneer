import type { CharacterId, OfferedCoins, ReviewedItemId } from '@pioneer/campaign/domain';
import type { Version } from '@pioneer/shared/kernel';

/** What the campaign context needs to know of a character's inventory line before it is offered. */
export interface OfferableLine {
  /** The line is a campaign's key item, which the GM controls and a member cannot give away. */
  readonly keyItem: boolean;
  /** The character's version now, kept with the offer so accepting it can tell the giver has changed since. */
  readonly version: Version;
}

/** What the campaign context needs to know of a character's purse before coins are offered. */
export interface OfferablePurse {
  /** The coins the character holds, per denomination. */
  readonly coins: OfferedCoins;
  /** The character's version now, kept with the offer so accepting it can tell the giver has changed since. */
  readonly version: Version;
}

/**
 * Port to the character context for the lines and coins members offer. That context owns the characters, so the
 * adapter lives in the composition root; `InMemoryTransferLines` is for tests.
 */
export abstract class TransferLines {
  /** The character's inventory line; none when the character or the line is gone. */
  public abstract describe(character: CharacterId, item: ReviewedItemId): Promise<OfferableLine | undefined>;

  /** The character's purse; none when the character is gone. */
  public abstract purse(character: CharacterId): Promise<OfferablePurse | undefined>;
}
