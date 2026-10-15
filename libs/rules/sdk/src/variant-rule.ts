import { Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EntrySlug } from './content-id';
import { ContentText } from './content-text';
import { RuleElements } from './rule-element';
import { SourceRef } from './source-ref';

/**
 * A structural change a variant rule needs that rule elements cannot make. It is declared as data so the builder
 * knows to offer it; the story that builds the change reads it. No behaviour hangs off it yet.
 */
export const VariantStructure = {
  /** Feat slots a class does not have (Free Archetype's archetype feats). */
  ExtraSlots: 'extraSlots',
  /** A second class beside the first (Dual Class). */
  SecondClass: 'secondClass',
} as const;
export type VariantStructure = ValueOf<typeof VariantStructure>;
const VariantStructureSchema = z.enum(VariantStructure);

const StructureList = z.array(VariantStructureSchema).readonly();

/**
 * A variant rule's `data` on the `ContentEntry` envelope: the structural changes it needs beyond its `rules`, absent
 * for a variant that is a pure rule-element set (Proficiency Without Level).
 */
export const VariantRuleData = z.strictObject({
  structure: StructureList.optional(),
});
export type VariantRuleData = z.infer<typeof VariantRuleData>;

/** Id of a variant rule content entry (UUIDv5 of `<pack>/<slug>`). */
export const VariantRuleId = Uuid.brand<'VariantRuleId'>();
export type VariantRuleId = z.infer<typeof VariantRuleId>;

const SOURCES_MAX = 16;

/**
 * A variant rule as a pack defines it (GM Core's Proficiency Without Level): what it changes is in `rules`, put in
 * play for every character it is enabled for, each element's origin naming the variant. `sources` are where it is
 * written, since every breakdown line it explains cites them.
 */
export const VariantRuleDefinition = z.strictObject({
  slug: EntrySlug,
  name: ContentText,
  sources: z.array(SourceRef).min(1).max(SOURCES_MAX),
  rules: RuleElements,
  /** The structural changes it needs beyond `rules`; absent when it needs none. */
  structure: StructureList.optional(),
});
export type VariantRuleDefinition = z.infer<typeof VariantRuleDefinition>;
