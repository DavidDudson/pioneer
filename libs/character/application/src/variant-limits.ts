import type { Character, RuleLimitOverrides } from '@pioneer/character/domain';

/**
 * Port to the table limits the variant rules in force change for a character (ADR-0064). Where two variants change the
 * same limit the more permissive wins. `CharacterVariantLimits` is the adapter; `InMemoryVariantLimits` is for tests.
 */
export abstract class VariantLimits {
  /** The limits the character's variant rules change; a limit none changes is left out. */
  public abstract of(character: Character): Promise<RuleLimitOverrides>;
}
