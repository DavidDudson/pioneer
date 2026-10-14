import type { Character, StatisticSources } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { variantsInForce } from '../data/registry-variants';
import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';

/**
 * What the sheet derives a character's statistics from: the registry it was built for, whose variant rules in force
 * are in play beside the character's items (`variantsInForce`).
 */
export function sheetSources(registry: ContentRegistry, character: Character): StatisticSources {
  return {
    registry,
    slots: sheetSlotContent(registry),
    inputs: statisticInputsOf(registry, character),
    variants: variantsInForce(registry),
  };
}
