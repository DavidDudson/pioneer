import type { Character, StatisticSources } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';

/**
 * What the sheet derives a character's statistics from. No variant rules are enabled here yet: the sheet loads the
 * character's set with the toggle (#820).
 */
export function sheetSources(registry: ContentRegistry, character: Character): StatisticSources {
  return { registry, slots: sheetSlotContent(registry), inputs: statisticInputsOf(registry, character), variants: [] };
}
