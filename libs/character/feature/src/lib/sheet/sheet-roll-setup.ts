import { rollSetup } from '@pioneer/character/domain';
import type { Character, RollRequest, RollSetup } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { sheetSources } from './sheet-sources';

/**
 * What rolling a statistic offers this character (`rollSetup`): the situations the roll may claim and the toggles it
 * may flip, and the statistic as they stand. Undefined when the statistic has no value.
 */
export function sheetRollSetup(
  registry: ContentRegistry,
  character: Character,
  request: RollRequest,
): RollSetup | undefined {
  const sources = sheetSources(registry, character);
  return rollSetup(character.document, sources, request);
}
