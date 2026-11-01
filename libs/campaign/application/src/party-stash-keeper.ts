import type { CampaignId, CharacterId, PartyStashContents, ReviewedItemId } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** A line going between a character and the stash. */
export interface StashLineMove {
  /** The character it comes from, or goes to. */
  readonly character: CharacterId;
  readonly item: ReviewedItemId;
}

/**
 * Port to what the party holds in common (ADR-0064). The stash is a flat inventory of the campaign's own; lines move
 * between it and a character with their contents, in one transaction that checks the character's version, so the
 * adapter spans the character context and the composition root provides it. `InMemoryPartyStashKeeper` is for tests.
 */
export abstract class PartyStashKeeper {
  /** The stash, its lines named from the content of `party`, the campaign's characters. */
  public abstract view(campaign: CampaignId, party: readonly CharacterId[]): Promise<PartyStashContents>;

  /**
   * Moves the character's line and what it holds into the stash. Throws `NotFoundError` when the character lacks the
   * line, and `ConflictError` for a key item's line or a stash with no room.
   */
  public abstract deposit(actor: UserId, campaign: CampaignId, move: StashLineMove): Promise<PartyStashContents>;

  /**
   * Moves the stash's line and what it holds into the character's inventory. Throws `NotFoundError` when the stash
   * lacks the line, and `ConflictError` for a character with no room.
   */
  public abstract take(actor: UserId, campaign: CampaignId, move: StashLineMove): Promise<PartyStashContents>;
}
