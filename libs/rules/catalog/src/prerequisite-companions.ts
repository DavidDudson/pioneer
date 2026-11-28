import { CompanionKind, companionRollOption } from '@pioneer/rules/sdk';
import type { PredicateStatement } from '@pioneer/rules/sdk';

/** The article is required: a bare "animal companion" names the feat (ADR-0079). */
const COMPANION_WORDS: ReadonlyMap<string, CompanionKind> = new Map([
  ['a familiar', CompanionKind.Familiar],
  ['an animal companion', CompanionKind.AnimalCompanion],
]);

/** The character has a live companion of the named kind: `self:companion:<kind>`. */
export function companionClause(clause: string): ReadonlyArray<PredicateStatement> | undefined {
  const kind = COMPANION_WORDS.get(clause);

  return kind === undefined ? undefined : [companionRollOption(kind)];
}
