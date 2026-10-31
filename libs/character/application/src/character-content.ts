import { CORE_RULE_LIMITS } from '@pioneer/character/domain';
import type { Character, RuleLimits } from '@pioneer/character/domain';
import { contentPackId } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentRegistry, ContentSource, VariantRuleEntry } from '@pioneer/rules/sdk';

import type { EffectivePacks } from './effective-packs';
import type { EffectiveRuleLimits } from './effective-rule-limits';
import type { EffectiveVariants } from './effective-variants';
import type { HeldContentPacks } from './held-content-packs';

/**
 * A content source that can also answer for one character. A plain `ContentSource` serves the official packs to
 * everyone, so a use case that is given one works as it did.
 */
export interface CharacterContentSource extends ContentSource {
  /** The content as `character` sees it: the official packs and the homebrew packs it uses. */
  readonly forCharacter?: (character: Character) => ContentSource;
  /**
   * The variant rules in force for `character`: enabled, and defined by a pack it uses. `registry` is the one already
   * loaded for it, read instead of loading again.
   */
  readonly variantRules?: (character: Character, registry?: ContentRegistry) => Promise<readonly VariantRuleEntry[]>;
  /**
   * The homebrew packs `character` holds content from that are not in force, a campaign having disabled them. Their
   * entries stay in its registry so what it holds still resolves, but nothing new may be picked from them.
   */
  readonly unsupportedPacks?: (character: Character) => Promise<readonly ContentPackId[]>;
  /** The limits `character`'s inventory is held to (ADR-0064); the core rules' for a source that does not know them. */
  readonly ruleLimits?: (character: Character) => Promise<RuleLimits>;
}

/** The content `character` is worked out over. */
export function contentOfCharacter(content: CharacterContentSource, character: Character): ContentSource {
  return content.forCharacter?.(character) ?? content;
}

/** The variant rules in force for `character`; none from a source that does not know them. */
export async function variantRulesOfCharacter(
  content: CharacterContentSource,
  character: Character,
  registry?: ContentRegistry,
): Promise<readonly VariantRuleEntry[]> {
  return (await content.variantRules?.(character, registry)) ?? [];
}

/** The limits `character`'s inventory is held to; the core rules' from a source that does not know them. */
export async function ruleLimitsOfCharacter(
  content: CharacterContentSource,
  character: Character,
): Promise<RuleLimits> {
  return (await content.ruleLimits?.(character)) ?? CORE_RULE_LIMITS;
}

/**
 * `content` for everyone, and for a character the homebrew packs `packs` says it uses as well, with the variant rules
 * `variants` says are enabled for it and the inventory limits `limits` says it is held to.
 */
export class CharacterContent implements CharacterContentSource {
  readonly #content: ContentSource;
  readonly #packs: EffectivePacks;
  readonly #variants: EffectiveVariants;
  readonly #limits: EffectiveRuleLimits | undefined;
  readonly #held: HeldContentPacks | undefined;

  public constructor(
    content: ContentSource,
    packs: EffectivePacks,
    rules: {
      readonly variants: EffectiveVariants;
      readonly limits?: EffectiveRuleLimits;
      readonly held?: HeldContentPacks;
    },
  ) {
    this.#content = content;
    this.#packs = packs;
    this.#variants = rules.variants;
    this.#limits = rules.limits;
    this.#held = rules.held;
  }

  public async ruleLimits(character: Character): Promise<RuleLimits> {
    return (await this.#limits?.of(character)) ?? CORE_RULE_LIMITS;
  }

  public async registry(): Promise<ContentRegistry> {
    return this.#content.registry();
  }

  public forCharacter(character: Character): ContentSource {
    return {
      registry: async () => {
        const [inForce, unsupported] = await Promise.all([this.#packs.of(character), this.unsupportedPacks(character)]);
        return this.#content.registry([...inForce, ...unsupported]);
      },
    };
  }

  public async unsupportedPacks(character: Character): Promise<readonly ContentPackId[]> {
    if (this.#held === undefined) {
      return [];
    }
    const [inForce, held] = await Promise.all([this.#packs.of(character), this.#held.of(character)]);
    const using = new Set(inForce);
    return held.filter((pack) => !using.has(pack));
  }

  /**
   * The enabled variant rules the character's registry holds. One whose pack is no longer in force is dropped, even
   * though the registry keeps the pack for what the character holds, and comes back with its pack (ADR-0061).
   */
  public async variantRules(character: Character, loaded?: ContentRegistry): Promise<readonly VariantRuleEntry[]> {
    const [registry, ids, unsupported] = await Promise.all([
      loaded ?? this.forCharacter(character).registry(),
      this.#variants.of(character),
      this.unsupportedPacks(character),
    ]);
    const dropped = new Set(unsupported);
    return ids.flatMap((id): VariantRuleEntry[] => {
      const entry = registry.variantRule(id);
      return entry === undefined || dropped.has(contentPackId(entry.pack.id)) ? [] : [entry];
    });
  }
}
