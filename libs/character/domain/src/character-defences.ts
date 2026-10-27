import { deriveDefences, statisticContent } from '@pioneer/rules/engine';
import type { Defences } from '@pioneer/rules/engine';

import type { CharacterDocument } from './character-document';
import { rulesInPlay } from './character-statistics';
import type { StatisticSources } from './character-statistics';

const NO_DEFENCE_LINES: Defences = { immunities: [], weaknesses: [], resistances: [] };

/**
 * The character's immunities, weaknesses and resistances (`deriveDefences`) with the rule elements in play, so a
 * battle form's lines and those of its items and conditions count. Empty without a proficiency bonus table, as
 * nothing can be derived.
 */
export function characterDefences(document: CharacterDocument, sources: StatisticSources): Defences {
  const content = statisticContent(sources.registry);
  return content === undefined
    ? NO_DEFENCE_LINES
    : deriveDefences(content, sources.inputs, rulesInPlay(document, sources));
}
