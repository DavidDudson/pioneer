import type { CharacterId, CharacterVariantRule } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterVariantRepository } from './character-variant-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterVariantRepository extends CharacterVariantRepository {
  readonly #rows = new Map<CharacterId, CharacterVariantRule[]>();

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterVariantRule[]> {
    return (this.#rows.get(characterId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
    );
  }

  public override async enable(_actor: UserId, characterId: CharacterId, rule: CharacterVariantRule): Promise<void> {
    const rows = this.#rows.get(characterId) ?? [];
    if (!rows.some((row) => row.variantId === rule.variantId)) {
      this.#rows.set(characterId, [...rows, rule]);
    }
  }

  public override async disable(_actor: UserId, characterId: CharacterId, variantId: VariantRuleId): Promise<void> {
    this.#rows.set(
      characterId,
      (this.#rows.get(characterId) ?? []).filter((row) => row.variantId !== variantId),
    );
  }
}
