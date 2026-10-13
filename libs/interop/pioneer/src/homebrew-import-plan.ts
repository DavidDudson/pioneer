import { canonicalJson, ContentText, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { EmbeddedPack } from './embedded-homebrew';

/** Who holds a pack id on the importing server. */
export const HomebrewPackStatus = {
  /** No pack has the id: the import makes it, owned by the importer. */
  New: 'new',
  /** The importer owns the pack: entries it lacks are added, identical ones reused. */
  Own: 'own',
  /** Another user's pack, or an official one: nothing is added to it, only identical entries are reused. */
  Taken: 'taken',
} as const;
export type HomebrewPackStatus = ValueOf<typeof HomebrewPackStatus>;

/** What an import does with one embedded entry. A clash is never written over (ADR-0059). */
export const HomebrewEntryOutcome = {
  Create: 'create',
  /** The pack already holds an identical entry. */
  Reuse: 'reuse',
  /** The pack holds a different entry under the slug, or is another user's and lacks it. */
  Clash: 'clash',
} as const;
export type HomebrewEntryOutcome = ValueOf<typeof HomebrewEntryOutcome>;

/** A pack the importing server already has, as far as an import needs to know it. */
export interface ExistingPack {
  readonly ownedByImporter: boolean;
  readonly entries: ReadonlyMap<EntrySlug, ContentEntry>;
}

/** The embedded packs' ids that exist on the importing server. */
export type ExistingPacks = ReadonlyMap<PackId, ExistingPack>;

export const HomebrewEntryReport = z.object({
  slug: EntrySlug,
  name: ContentText,
  outcome: z.enum(HomebrewEntryOutcome),
});
export type HomebrewEntryReport = z.infer<typeof HomebrewEntryReport>;

export const HomebrewPackReport = z.object({
  pack: PackId,
  title: ContentText,
  publisher: ContentText,
  status: z.enum(HomebrewPackStatus),
  entries: z.array(HomebrewEntryReport).readonly(),
});
export type HomebrewPackReport = z.infer<typeof HomebrewPackReport>;

/** What an import would do with one embedded pack: the report the user sees, and the entries to write. */
export interface HomebrewPackPlan {
  readonly embedded: EmbeddedPack;
  readonly report: HomebrewPackReport;
  readonly toCreate: readonly ContentEntry[];
}

function sameEntry(left: ContentEntry, right: ContentEntry): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function outcomeOf(
  entry: ContentEntry,
  status: HomebrewPackStatus,
  existing: ExistingPack | undefined,
): HomebrewEntryOutcome {
  const held = existing?.entries.get(EntrySlug.parse(entry.slug));
  if (held !== undefined) {
    return sameEntry(held, entry) ? HomebrewEntryOutcome.Reuse : HomebrewEntryOutcome.Clash;
  }
  return status === HomebrewPackStatus.Taken ? HomebrewEntryOutcome.Clash : HomebrewEntryOutcome.Create;
}

function statusOf(existing: ExistingPack | undefined): HomebrewPackStatus {
  if (existing === undefined) {
    return HomebrewPackStatus.New;
  }
  return existing.ownedByImporter ? HomebrewPackStatus.Own : HomebrewPackStatus.Taken;
}

/**
 * What importing each embedded pack does, given the packs the importing server has. Never overwrites: an entry the
 * pack already holds is reused when identical and reported as a clash when not. A clash leaves the character's
 * reference as an id that resolves to the other entry (or none), exactly as unmatched content does.
 */
export function planHomebrewImport(embedded: readonly EmbeddedPack[], existing: ExistingPacks): HomebrewPackPlan[] {
  return embedded.map((pack) => {
    const held = existing.get(pack.pack.id);
    const status = statusOf(held);
    const outcomes = pack.entries.map((entry) => ({ entry, outcome: outcomeOf(entry, status, held) }));
    return {
      embedded: pack,
      toCreate: outcomes.filter(({ outcome }) => outcome === HomebrewEntryOutcome.Create).map(({ entry }) => entry),
      report: {
        pack: pack.pack.id,
        title: pack.pack.title,
        publisher: pack.pack.publisher,
        status,
        entries: outcomes.map(({ entry, outcome }) => ({
          slug: EntrySlug.parse(entry.slug),
          name: entry.name,
          outcome,
        })),
      },
    };
  });
}
