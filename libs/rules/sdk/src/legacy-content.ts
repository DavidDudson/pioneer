import { VariantRuleId } from './variant-rule';

/**
 * The variant rule that turns legacy content on: pre-remaster entries under the Open Game License. It is off until a
 * campaign enables it, or a character outside campaigns does, so a remaster-only table never sees legacy content.
 * Its id is the UUIDv5 of `core-rules/variant-rule:legacy-content`.
 */
export const LEGACY_CONTENT_VARIANT = VariantRuleId.parse('d92b05a2-c2d4-56b0-b03e-2f96d848bed5');
