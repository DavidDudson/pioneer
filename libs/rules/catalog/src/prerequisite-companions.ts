import { CompanionKind, companionRollOption } from '@pioneer/rules/sdk';
import type { PredicateStatement } from '@pioneer/rules/sdk';

/** The kinds of companion a prerequisite names: "a familiar" is a live companion of the kind (ADR-0079). */
const COMPANION_WORDS: ReadonlyMap<string, CompanionKind> = new Map([['a familiar', CompanionKind.Familiar]]);

/** "a familiar": the character has a live companion of that kind, `self:companion:familiar`. */
export function companionClause(clause: string): readonly PredicateStatement[] | undefined {
  const kind = COMPANION_WORDS.get(clause);

  return kind === undefined ? undefined : [companionRollOption(kind)];
}
