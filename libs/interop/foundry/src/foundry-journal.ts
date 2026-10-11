import * as z from 'zod';

/**
 * The fields of a Foundry journal the importer reads (`packs/pf2e/journals/*.json`): its text pages. Foundry keeps
 * archetypes as pages of one journal rather than as items, so the archetype entries come from there. Loose, as
 * Foundry's documents are (`foundry-document.ts`).
 */

const ID_MAX = 64;
const NAME_MAX = 500;
const PAGES_MAX = 2000;
/** Ten times the longest archetype page at `pf2e-8.6.0`. */
const CONTENT_MAX = 500_000;

export const FoundryJournalPage = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  type: z.string().max(ID_MAX),
  text: z.looseObject({ content: z.string().max(CONTENT_MAX).nullish() }).optional(),
});
export type FoundryJournalPage = z.infer<typeof FoundryJournalPage>;

export const FoundryJournal = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  pages: z.array(FoundryJournalPage).max(PAGES_MAX).default([]),
});
export type FoundryJournal = z.infer<typeof FoundryJournal>;
