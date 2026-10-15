import type { Character } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';

/**
 * Port to the variant rules enabled for a character: the attached campaign's, else the owner's own (ADR-0061). A
 * variant rule whose pack is not in force is still listed here; the registry has no entry for it, so whoever resolves
 * the ids drops it. `CharacterVariantService` is the adapter.
 */
export abstract class EffectiveVariants {
  public abstract of(character: Character): Promise<readonly VariantRuleId[]>;
}
