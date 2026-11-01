import { slotContent } from '@pioneer/character/domain';
import type { SlotContent } from '@pioneer/character/domain';
import type { ContentRegistry, VariantRuleEntry } from '@pioneer/rules/sdk';

/**
 * The slot content of a registry, per set of variant rules in force. Building it indexes the whole registry (about
 * 70 ms), and the content source shares one registry per set of packs until a pack changes, so it is built once per
 * registry rather than on every read. A rebuilt registry is a new key; the old one's entries go with it.
 */
export class SlotContentCache {
  readonly #built = new WeakMap<ContentRegistry, Map<string, SlotContent>>();

  public of(registry: ContentRegistry, variants: readonly VariantRuleEntry[]): SlotContent {
    const variantKey = variants.map((variant) => variant.id).join(',');
    const forRegistry = this.#built.get(registry) ?? new Map<string, SlotContent>();
    const cached = forRegistry.get(variantKey);
    if (cached !== undefined) {
      return cached;
    }
    const content = slotContent(registry, variants);
    forRegistry.set(variantKey, content);
    this.#built.set(registry, forRegistry);
    return content;
  }
}
