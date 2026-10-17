import type { CharacterId, CharacterRuleLimit, RuleLimitField } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterRuleLimitRepository } from './character-rule-limit-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterRuleLimitRepository extends CharacterRuleLimitRepository {
  readonly #rows = new Map<CharacterId, Map<RuleLimitField, CharacterRuleLimit>>();

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterRuleLimit[]> {
    return [...(this.#rows.get(characterId)?.values() ?? [])];
  }

  public override async set(_actor: UserId, characterId: CharacterId, limit: CharacterRuleLimit): Promise<void> {
    const rows = this.#rows.get(characterId) ?? new Map<RuleLimitField, CharacterRuleLimit>();
    rows.set(limit.limit, limit);
    this.#rows.set(characterId, rows);
  }

  public override async reset(_actor: UserId, characterId: CharacterId, limit: RuleLimitField): Promise<void> {
    this.#rows.get(characterId)?.delete(limit);
  }
}
