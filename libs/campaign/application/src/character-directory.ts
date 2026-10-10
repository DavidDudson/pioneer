import type { CharacterId, PartyCharacterLevel, PartyCharacterName } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** What the campaign context knows of a character: whose it is and how to show it. */
export interface CharacterSummary {
  readonly id: CharacterId;
  readonly ownerId: UserId;
  readonly name: PartyCharacterName;
  readonly level: PartyCharacterLevel;
}

/**
 * Port to the character context for the characters a party is made of. That context owns
 * characters, so the adapter lives in the composition root; `InMemoryCharacterDirectory` is for tests.
 */
export abstract class CharacterDirectory {
  /** The user's characters, by name; id breaks ties. */
  public abstract ownedBy(userId: UserId): Promise<readonly CharacterSummary[]>;

  /** Each character that exists, whoever owns it; unknown ids are left out. */
  public abstract byIds(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, CharacterSummary>>;
}
