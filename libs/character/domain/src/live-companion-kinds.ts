import type { CompanionKind } from '@pioneer/rules/sdk';

import type { Companion } from './companion';

/** The kinds the character has a live companion of: an archived one no longer counts (ADR-0062, ADR-0079). */
export function liveCompanionKinds(companions: ReadonlyArray<Companion>): ReadonlyArray<CompanionKind> {
  return companions.flatMap((companion) => (companion.archived === undefined ? [companion.kind] : []));
}
