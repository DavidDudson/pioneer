import { ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A pack as another pack's dependencies list it: official or homebrew, with only what a picker and a list need.
 * Official packs are public and have no owner.
 */
export const PackSummary = z.object({
  id: ContentPackId,
  slug: PackId,
  title: ContentText,
  publisher: ContentText,
  visibility: z.enum(PackVisibility),
  official: z.boolean(),
});
export type PackSummary = z.output<typeof PackSummary>;

/** JSON shape of a pack's dependencies, as a reader of the pack sees them. */
export const PackDependencies = z.object({
  /** Whether the viewer owns the pack, so may add and remove dependencies. */
  editable: z.boolean(),
  /** The packs it extends directly, by title. */
  dependencies: z.array(PackSummary).readonly(),
  /** The packs the viewer may add: readable, not yet added, and none that would close a cycle or narrow the pack. Empty unless the viewer owns the pack. */
  candidates: z.array(PackSummary).readonly(),
});
export type PackDependencies = z.output<typeof PackDependencies>;
