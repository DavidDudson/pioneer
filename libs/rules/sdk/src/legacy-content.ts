import type { ContentRegistry } from './content-registry';
import { VariantRuleId } from './variant-rule';

/**
 * The variant rule that turns legacy content on: pre-remaster entries under the Open Game License. It is off until a
 * campaign enables it, or a character outside campaigns does, so a remaster-only table never sees legacy content.
 * Its id is the UUIDv5 of `core-rules/variant-rule:legacy-content`.
 */
export const LEGACY_CONTENT_VARIANT = VariantRuleId.parse('d92b05a2-c2d4-56b0-b03e-2f96d848bed5');

/**
 * Registries whose character has legacy content on. The browser builds a registry per character, so the mark rides
 * with the registry (like the unsupported packs); one built for no character has it off.
 */
const ON = new WeakSet<ContentRegistry>();

/** Records that the registry's character has legacy content on. */
export function putLegacyContent(registry: ContentRegistry): void {
  ON.add(registry);
}

/** Whether legacy content is on for the registry's character; off for a registry built for no character. */
export function legacyContentIn(registry: ContentRegistry): boolean {
  return ON.has(registry);
}
