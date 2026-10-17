import type { CharacterId, CharacterRuleLimit, RuleLimitField } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** Port for the table limits characters have set. Adapters live in `character-infrastructure`; the in-memory one is for tests. */
export abstract class CharacterRuleLimitRepository {
  /** The limits the character has set; a limit it has not set is absent. */
  public abstract listForCharacter(characterId: CharacterId): Promise<readonly CharacterRuleLimit[]>;

  /** Set the limit, replacing the number when the character has set it already. */
  public abstract set(actor: UserId, characterId: CharacterId, limit: CharacterRuleLimit): Promise<void>;

  /** Return the limit to the core rules' number; nothing happens when the character never set it. */
  public abstract reset(actor: UserId, characterId: CharacterId, limit: RuleLimitField): Promise<void>;
}
