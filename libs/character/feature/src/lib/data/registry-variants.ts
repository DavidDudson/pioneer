import type { ContentRegistry, VariantRuleEntry, VariantRuleId } from '@pioneer/rules/sdk';

/**
 * The variant rules in force for the character a registry was built for. The browser builds a registry per character
 * and per set of enabled variant rules (`injectContentRegistry`), so the set rides with the registry, as the server's
 * `CharacterContent` answers for a character; the sheet's derivations read it from here.
 */
const IN_FORCE = new WeakMap<ContentRegistry, readonly VariantRuleEntry[]>();

/** Records the enabled variant rules the registry holds, in the order given; one it has no entry for is dropped. */
export function putVariantsInForce(registry: ContentRegistry, enabled: readonly VariantRuleId[]): void {
  IN_FORCE.set(
    registry,
    enabled.flatMap((id): VariantRuleEntry[] => {
      const entry = registry.variantRule(id);
      return entry === undefined ? [] : [entry];
    }),
  );
}

/** The variant rules in force for the registry's character; none for a registry built for no character. */
export function variantsInForce(registry: ContentRegistry): readonly VariantRuleEntry[] {
  return IN_FORCE.get(registry) ?? [];
}
