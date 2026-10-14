import type { CharacterId, CharacterVariantRule } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/** Port for the variant rules characters have enabled. Adapters live in `character-infrastructure`; the in-memory one is for tests. */
export abstract class CharacterVariantRepository {
  /** The character's enabled variant rules, oldest first; id breaks ties. */
  public abstract listForCharacter(characterId: CharacterId): Promise<readonly CharacterVariantRule[]>;

  /** Enable the variant rule unless the character has it already. */
  public abstract enable(actor: UserId, characterId: CharacterId, rule: CharacterVariantRule): Promise<void>;

  /** Stop the character using the variant rule; nothing happens when it does not. */
  public abstract disable(actor: UserId, characterId: CharacterId, variantId: VariantRuleId): Promise<void>;
}
