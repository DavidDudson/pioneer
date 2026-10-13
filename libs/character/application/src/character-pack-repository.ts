import type { CharacterId, CharacterPack } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/** Port for the packs characters have enabled. Adapters live in `character-infrastructure`; the in-memory one is for tests. */
export abstract class CharacterPackRepository {
  /** The character's enabled packs, oldest first; id breaks ties. */
  public abstract listForCharacter(characterId: CharacterId): Promise<readonly CharacterPack[]>;

  /** Enable the packs unless the character has them already. */
  public abstract enable(actor: UserId, characterId: CharacterId, packs: readonly CharacterPack[]): Promise<void>;

  /** Stop the character using the pack; nothing happens when it does not. */
  public abstract disable(actor: UserId, characterId: CharacterId, packId: ContentPackId): Promise<void>;
}
