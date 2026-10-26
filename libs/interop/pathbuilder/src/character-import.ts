import { Character } from '@pioneer/character/domain';
import { Endpoint, HttpMethod, NoParams, NoQuery } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ModifierDifference, UnplacedBoost } from './boost-placement';
import type { ContentLookup } from './content-lookup';
import { DiscrepancyReport } from './discrepancy-report';
import { ImportKind, ImportKindSchema, PathbuilderName } from './import-kind';
import type { ImportedName } from './import-kind';
import { buildImportReport, MatchStatus, Occurrences } from './import-report';
import type { ReportRow } from './import-report';
import type { PathbuilderImport } from './read-pathbuilder-export';
import { SkillGap } from './skill-placement';
import { SpellGap } from './spell-listing';

/** Why a name was not carried over. */
export const UnmatchedReason = {
  Unmatched: MatchStatus.Unmatched,
  KindNotLoaded: MatchStatus.KindNotLoaded,
  /** The name matched content, but its slot doesn't offer it: a heritage of another ancestry. */
  NotOffered: 'not-offered',
} as const;
export type UnmatchedReason = ValueOf<typeof UnmatchedReason>;

/**
 * Parts of an export the character model can't hold yet: every import kind but the ancestry, heritage, background, item, language and
 * class. They light up as the builder stories (#308-#311) give the character somewhere to keep them.
 */
export const UncarriedField = {
  Deity: ImportKind.Deity,
  ClassFeature: ImportKind.ClassFeature,
  Spell: ImportKind.Spell,
  Ritual: ImportKind.Ritual,
} as const;
export type UncarriedField = ValueOf<typeof UncarriedField>;

/** How many imported inventory lines or feats break a table rule. */
export const RuleBreakingCount = z.int().nonnegative().brand<'RuleBreakingCount'>();
export type RuleBreakingCount = z.infer<typeof RuleBreakingCount>;

export const UnmatchedName = z.object({
  name: PathbuilderName,
  occurrences: Occurrences,
  reason: z.enum(UnmatchedReason),
});
export type UnmatchedName = z.infer<typeof UnmatchedName>;

export const UnmatchedGroup = z.object({ kind: ImportKindSchema, names: z.array(UnmatchedName).readonly() });
export type UnmatchedGroup = z.infer<typeof UnmatchedGroup>;

/**
 * What an import left behind: names that matched no content or none their slot offers, by kind, the fields it had
 * nowhere to put, the boosts no slot took, the skill ranks no slot reached, and the attributes whose modifier from the placed boosts isn't Pathbuilder's.
 */
export const CharacterImportReport = z.object({
  unmatched: z.array(UnmatchedGroup).readonly(),
  notCarried: z.array(z.enum(UncarriedField)).readonly(),
  unplacedBoosts: z.array(UnplacedBoost).readonly(),
  skillGaps: z.array(SkillGap).readonly(),
  spellGaps: z.array(SpellGap).readonly(),
  modifierDifferences: z.array(ModifierDifference).readonly(),
  discrepancies: DiscrepancyReport,
  ruleBreaking: RuleBreakingCount,
  /** The imported feats no slot offers, kept on the character and flagged rather than forced into a slot. */
  ruleBreakingFeats: RuleBreakingCount,
});
export type CharacterImportReport = z.infer<typeof CharacterImportReport>;

/** Why `row` was not carried over, or undefined when it was: matched, and not among the names its slot refused. */
function unmatchedReason(row: ReportRow, notOffered: readonly ImportedName[]): UnmatchedReason | undefined {
  if (row.status !== MatchStatus.Matched) {
    return row.status;
  }
  const refused = notOffered.some((name) => name.kind === row.kind && name.name === row.name);
  return refused ? UnmatchedReason.NotOffered : undefined;
}

function unmatchedGroups(
  value: PathbuilderImport,
  lookup: ContentLookup,
  notOffered: readonly ImportedName[],
): UnmatchedGroup[] {
  return buildImportReport(value.names, lookup).groups.flatMap((group): UnmatchedGroup[] => {
    const names = group.rows.flatMap((row): UnmatchedName[] => {
      const reason = unmatchedReason(row, notOffered);
      return reason === undefined ? [] : [{ name: row.name, occurrences: row.occurrences, reason }];
    });
    return names.length === 0 ? [] : [{ kind: group.kind, names }];
  });
}

function notCarried(value: PathbuilderImport): UncarriedField[] {
  const present = new Set<ImportKind>(value.names.map((name) => name.kind));
  return Object.values(UncarriedField).filter((field) => present.has(field));
}

/**
 * What the import did with the export: the matched names their slot refused (a heritage of another ancestry), the
 * boosts no slot took, and where the derived modifiers part from Pathbuilder's.
 */
export interface ImportOutcome {
  readonly notOffered: readonly ImportedName[];
  readonly unplacedBoosts: readonly UnplacedBoost[];
  readonly skillGaps: readonly SkillGap[];
  readonly spellGaps: readonly SpellGap[];
  readonly modifierDifferences: readonly ModifierDifference[];
  readonly discrepancies: DiscrepancyReport;
  readonly ruleBreaking: RuleBreakingCount;
  readonly ruleBreakingFeats: RuleBreakingCount;
}

/** The report shown on a character created from `value`. */
export function characterImportReport(
  value: PathbuilderImport,
  lookup: ContentLookup,
  { notOffered, ...boosts }: ImportOutcome,
): CharacterImportReport {
  return { unmatched: unmatchedGroups(value, lookup, notOffered), notCarried: notCarried(value), ...boosts };
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
