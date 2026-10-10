import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentLookup, ContentMatch } from './content-lookup';
import { IMPORT_KIND_ORDER } from './import-kind';
import type { ImportedName, ImportKind, PathbuilderName } from './import-kind';

export const MatchStatus = {
  Matched: 'matched',
  /** Content of this kind is loaded, but no entry has this name. */
  Unmatched: 'unmatched',
  /** No content of this kind is loaded yet, so nothing could match. */
  KindNotLoaded: 'kind-not-loaded',
} as const;
export type MatchStatus = ValueOf<typeof MatchStatus>;

/** How many times a name appears in the export. */
export const Occurrences = z.int().positive().brand<'Occurrences'>();
export type Occurrences = z.infer<typeof Occurrences>;

/** One distinct name of one kind, and what it matched. */
export interface ReportRow {
  readonly kind: ImportKind;
  readonly name: PathbuilderName;
  readonly occurrences: Occurrences;
  readonly status: MatchStatus;
  readonly match: ContentMatch | undefined;
}

export interface ReportGroup {
  readonly kind: ImportKind;
  readonly rows: readonly ReportRow[];
}

/** Every name in an export by kind, in `IMPORT_KIND_ORDER`, with what it matched. Empty kinds are left out. */
export interface ImportReport {
  readonly groups: readonly ReportGroup[];
}

function status(lookup: ContentLookup, kind: ImportKind, match: ContentMatch | undefined): MatchStatus {
  if (match !== undefined) {
    return MatchStatus.Matched;
  }
  return lookup.supports(kind) ? MatchStatus.Unmatched : MatchStatus.KindNotLoaded;
}

/** Count repeats per kind and name, keeping first-seen order. */
function tally(names: readonly ImportedName[]): Map<ImportKind, Map<PathbuilderName, number>> {
  const counts = new Map<ImportKind, Map<PathbuilderName, number>>();
  for (const { kind, name } of names) {
    const byName = counts.get(kind) ?? new Map<PathbuilderName, number>();
    byName.set(name, (byName.get(name) ?? 0) + 1);
    counts.set(kind, byName);
  }
  return counts;
}

export function buildImportReport(names: readonly ImportedName[], lookup: ContentLookup): ImportReport {
  const counts = tally(names);
  const groups = IMPORT_KIND_ORDER.flatMap((kind): ReportGroup[] => {
    const byName = counts.get(kind);
    if (byName === undefined) {
      return [];
    }
    const rows = [...byName].map(([name, count]): ReportRow => {
      const match = lookup.resolve(kind, name);
      return { kind, name, occurrences: Occurrences.parse(count), status: status(lookup, kind, match), match };
    });
    return [{ kind, rows }];
  });
  return { groups };
}

/** The rows that did not match, for a short summary or the post-import report. */
export function unmatchedRows(report: ImportReport): readonly ReportRow[] {
  return report.groups.flatMap((group) => group.rows.filter((row) => row.status !== MatchStatus.Matched));
}
