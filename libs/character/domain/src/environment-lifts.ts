import { liftedRestrictions } from '@pioneer/rules/engine';
import type { LiftedRestriction } from '@pioneer/rules/engine';

import type { CharacterDocument } from './character-document';
import { rulesInPlay } from './character-statistics';
import type { StatisticSources } from './character-statistics';

/**
 * The environment restrictions lifted for a character: the `LiftRestriction` elements of everything in play (build,
 * items, conditions, effects, the environments it is in), each with what lifts it.
 */
export function characterLiftedRestrictions(
  document: CharacterDocument,
  sources: Pick<StatisticSources, 'registry' | 'slots' | 'variants'>,
): readonly LiftedRestriction[] {
  return liftedRestrictions(rulesInPlay(document, sources));
}
