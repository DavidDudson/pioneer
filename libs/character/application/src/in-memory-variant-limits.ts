import type { Character, CharacterId, RuleLimitOverrides } from '@pioneer/character/domain';

import { VariantLimits } from './variant-limits';

/** Adapter for tests: the limits each character's variant rules change are given up front, and can change. */
export class InMemoryVariantLimits extends VariantLimits {
  readonly #declared = new Map<CharacterId, RuleLimitOverrides>();

  /** The character's variant rules change exactly these limits from now on. */
  public declare(characterId: CharacterId, limits: RuleLimitOverrides): this {
    this.#declared.set(characterId, limits);
    return this;
  }

  public override async of(character: Character): Promise<RuleLimitOverrides> {
    return this.#declared.get(character.id) ?? {};
  }
}
