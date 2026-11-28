import { CompanionKind, companionRollOption } from '@pioneer/rules/sdk';
import type { PredicateStatement } from '@pioneer/rules/sdk';

/**
 * The kinds of companion a prerequisite names: "a familiar" and "an animal companion" are a live companion of the kind
 * (ADR-0079). The article is required: a bare "animal companion" names the feat.
 */
const COMPANION_WORDS: ReadonlyMap<string, CompanionKind> = new Map([
  ['a familiar', CompanionKind.Familiar],
  ['an animal companion', CompanionKind.AnimalCompanion],
]);

/** "a familiar", "an animal companion": the character has a live companion of that kind, `self:companion:<kind>`. */
export function companionClause(clause: string): ReadonlyArray<PredicateStatement> | undefined {
  const kind = COMPANION_WORDS.get(clause);

  return kind === undefined ? undefined : [companionRollOption(kind)];
}
