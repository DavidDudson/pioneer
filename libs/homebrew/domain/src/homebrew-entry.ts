import {
  ContentId,
  ContentKindSchema,
  ContentLevel,
  ContentPackId,
  ContentText,
  EntrySlug,
  Level,
  Rarity,
  Trait,
} from '@pioneer/rules/sdk';
import { InstantCodec } from '@pioneer/shared/kernel';
import * as z from 'zod';

const TRAITS_MAX = 32;

/** What an author sets on an entry whatever its kind: its name, level, rarity and traits. */
const entryFields = {
  name: ContentText,
  /** A creature's level runs from -1; every other kind's from 0. */
  level: z.union([ContentLevel, Level]).optional(),
  rarity: z.enum(Rarity),
  traits: z.array(Trait).max(TRAITS_MAX),
};

/** A new entry: its kind is fixed from here on, because the kind is part of its id (ADR-0034). */
export const CreateHomebrewEntryBody = z.object({ kind: ContentKindSchema, ...entryFields });

export type CreateHomebrewEntryBody = z.infer<typeof CreateHomebrewEntryBody>;

/** The author's changes to an entry. Its slug and id never change. */
export const UpdateHomebrewEntryBody = z.object(entryFields);

export type UpdateHomebrewEntryBody = z.infer<typeof UpdateHomebrewEntryBody>;

/** An entry of a pack as its author sees it in the pack's list. */
export const HomebrewEntrySummary = z.object({
  id: ContentId,
  packId: ContentPackId,
  kind: ContentKindSchema,
  slug: EntrySlug,
  ...entryFields,
  /** Set when the author archived it (ADR-0062); absent while it is live. */
  archivedAt: InstantCodec.optional(),
  updatedAt: InstantCodec,
});

export type HomebrewEntrySummary = z.infer<typeof HomebrewEntrySummary>;
