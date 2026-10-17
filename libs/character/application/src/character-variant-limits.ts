import { RuleLimitOverridesSchema } from '@pioneer/character/domain';
import type { Character, RuleLimitOverrides } from '@pioneer/character/domain';
import { variantLimitsInForce } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';

import type { EffectivePacks } from './effective-packs';
import type { EffectiveVariants } from './effective-variants';
import { VariantLimits } from './variant-limits';

/** The ports `CharacterVariantLimits` works through. */
export interface CharacterVariantLimitPorts {
  /** The official content, which `packs` extends with the homebrew a character uses. */
  readonly content: ContentSource;
  readonly packs: EffectivePacks;
  readonly variants: EffectiveVariants;
}

/**
 * The limits changed by the variant rules a character has in force: its campaign's, else its owner's (ADR-0061). A
 * variant rule whose pack is not in force has no entry and changes nothing. Framework-free.
 */
export class CharacterVariantLimits extends VariantLimits {
  readonly #content: ContentSource;
  readonly #packs: EffectivePacks;
  readonly #variants: EffectiveVariants;

  public constructor({ content, packs, variants }: CharacterVariantLimitPorts) {
    super();
    this.#content = content;
    this.#packs = packs;
    this.#variants = variants;
  }

  public override async of(character: Character): Promise<RuleLimitOverrides> {
    const [packs, enabled] = await Promise.all([this.#packs.of(character), this.#variants.of(character)]);
    const registry = await this.#content.registry(packs);
    return RuleLimitOverridesSchema.parse(variantLimitsInForce(registry, enabled));
  }
}
