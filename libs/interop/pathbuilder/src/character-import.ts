import { Character } from '@pioneer/character/domain';
import { Endpoint, HttpMethod, NoParams, NoQuery } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentLookup } from './content-lookup';
import { ImportKind, ImportKindSchema, PathbuilderName } from './import-kind';
import { buildImportReport, MatchStatus, Occurrences } from './import-report';
import type { PathbuilderImport } from './read-pathbuilder-export';

/** Why a name was not carried over. */
export const UnmatchedReason = {
  Unmatched: MatchStatus.Unmatched,
  KindNotLoaded: MatchStatus.KindNotLoaded,
} as const;
export type UnmatchedReason = ValueOf<typeof UnmatchedReason>;

/**
 * Parts of an export the character model can't hold yet: every import kind but the ancestry, plus lores. They
 * light up as the builder stories (#308-#311) give the character somewhere to keep them.
 */
export const UncarriedField = {
  Heritage: ImportKind.Heritage,
  Background: ImportKind.Background,
  Class: ImportKind.Class,
  Deity: ImportKind.Deity,
  Feat: ImportKind.Feat,
  ClassFeature: ImportKind.ClassFeature,
  Spell: ImportKind.Spell,
  Ritual: ImportKind.Ritual,
  Item: ImportKind.Item,
  Language: ImportKind.Language,
  Lore: 'lore',
} as const;
export type UncarriedField = ValueOf<typeof UncarriedField>;

export const UnmatchedName = z.object({
  name: PathbuilderName,
  occurrences: Occurrences,
  reason: z.enum(UnmatchedReason),
});
export type UnmatchedName = z.infer<typeof UnmatchedName>;

export const UnmatchedGroup = z.object({ kind: ImportKindSchema, names: z.array(UnmatchedName).readonly() });
export type UnmatchedGroup = z.infer<typeof UnmatchedGroup>;

/** What an import left behind: names that matched no content, by kind, and the fields it had nowhere to put. */
export const CharacterImportReport = z.object({
  unmatched: z.array(UnmatchedGroup).readonly(),
  notCarried: z.array(z.enum(UncarriedField)).readonly(),
});
export type CharacterImportReport = z.infer<typeof CharacterImportReport>;

function unmatchedGroups(value: PathbuilderImport, lookup: ContentLookup): UnmatchedGroup[] {
  return buildImportReport(value.names, lookup).groups.flatMap((group): UnmatchedGroup[] => {
    const names = group.rows.flatMap((row): UnmatchedName[] =>
      row.status === MatchStatus.Matched ? [] : [{ name: row.name, occurrences: row.occurrences, reason: row.status }],
    );
    return names.length === 0 ? [] : [{ kind: group.kind, names }];
  });
}

function notCarried(value: PathbuilderImport): UncarriedField[] {
  const present = new Set<ImportKind | UncarriedField>(value.names.map((name) => name.kind));
  if (value.lores.length > 0) {
    present.add(UncarriedField.Lore);
  }
  return Object.values(UncarriedField).filter((field) => present.has(field));
}

/** The report shown on a character created from `value`. */
export function characterImportReport(value: PathbuilderImport, lookup: ContentLookup): CharacterImportReport {
  return { unmatched: unmatchedGroups(value, lookup), notCarried: notCarried(value) };
}

export const PathbuilderImportResponse = z.object({ character: Character.codec, report: CharacterImportReport });
export type PathbuilderImportResponse = z.output<typeof PathbuilderImportResponse>;

/**
 * Create a character from a Pathbuilder export. The body is the export itself; the server reads it again and never
 * trusts a client's preview. The body is `z.unknown()` on purpose: the service is the trust boundary, so a bad export
 * comes back as its own problem rather than a generic schema 422. Lives here, not in `CharacterContract`, because this lib already depends on the
 * character domain.
 */
export const PathbuilderImportContract = {
  import: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/import/pathbuilder',
    params: NoParams,
    query: NoQuery,
    body: z.unknown(),
    response: PathbuilderImportResponse,
  }),
} as const;
