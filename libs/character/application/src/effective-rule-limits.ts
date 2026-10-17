import type { Character, RuleLimits } from '@pioneer/character/domain';

/**
 * Port to the limits a character's inventory is held to: the attached campaign's, else the owner's own, else the core rules' (ADR-0064).
 * `CharacterRuleLimitService` is the adapter.
 */
export abstract class EffectiveRuleLimits {
  public abstract of(character: Character): Promise<RuleLimits>;
}
