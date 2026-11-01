import type {
  CharacterId,
  PartyCharacterLevel,
  PartyCharacterName,
  PartyCharacterOrigin,
  PartyVitals,
} from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** What the campaign context knows of a character: whose it is and how to show it. */
export interface CharacterSummary {
  readonly id: CharacterId;
  readonly ownerId: UserId;
  readonly name: PartyCharacterName;
  readonly level: PartyCharacterLevel;
  /** The content entries its build picked; undefined while the slot is empty. */
  readonly ancestry?: PartyCharacterOrigin | undefined;
  readonly class?: PartyCharacterOrigin | undefined;
  /** Archived by its owner (ADR-0062): still attached, not offered for attaching. */
  readonly archived: boolean;
}

/**
 * Port to the character context for the characters a party is made of. That context owns
 * characters, so the adapter lives in the composition root; `InMemoryCharacterDirectory` is for tests.
 */
export abstract class CharacterDirectory {
  /** The user's live characters, by name; id breaks ties. An archived one is not offered. */
  public abstract ownedBy(userId: UserId): Promise<readonly CharacterSummary[]>;

  /** Each character that exists, whoever owns it, archived ones flagged; unknown ids are left out. */
  public abstract byIds(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, CharacterSummary>>;

  /**
   * How each character stands, worked out from its play state on every read: Hit Points, dying and conditions. Unknown
   * ids are left out. The caller leaves archived characters out of `ids`; none of this is shown for them.
   */
  public abstract vitalsOf(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, PartyVitals>>;
}
