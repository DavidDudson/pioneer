import type { CharacterId, ItemAcknowledgement, ItemAcknowledgementId } from '@pioneer/character/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** The acknowledgement to take back, and when. */
export interface ItemAcknowledgementRevocation {
  readonly id: ItemAcknowledgementId;
  readonly at: Temporal.Instant;
}

/**
 * Port for the rule-breaking lines owners have acknowledged on a character outside a campaign (ADR-0064). A revoked
 * acknowledgement is archived, never deleted (ADR-0062), and every read skips it. Adapters live in
 * `character-infrastructure`; the in-memory one is for tests.
 */
export abstract class CharacterItemAcknowledgementRepository {
  /** The character's live acknowledgements, oldest first; id breaks ties. */
  public abstract listForCharacter(characterId: CharacterId): Promise<readonly ItemAcknowledgement[]>;

  /** Acknowledge the line, replacing the live acknowledgement for the same item, rule and rune when there is one. */
  public abstract acknowledge(
    actor: UserId,
    characterId: CharacterId,
    acknowledgement: ItemAcknowledgement,
  ): Promise<void>;

  /** Archive the acknowledgement; nothing happens when the character has no live one with that id. */
  public abstract revoke(
    actor: UserId,
    characterId: CharacterId,
    revocation: ItemAcknowledgementRevocation,
  ): Promise<void>;
}
