import { equippedRules, itemContent, slotContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { deriveStatistics, statisticContent } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';

/** The statistics the sheet lists, in order: Armor Class, the three saves, then Perception. */
const SHEET_STATISTICS: readonly Selector[] = ['ac', 'save:fortitude', 'save:reflex', 'save:will', 'perception'].map(
  (selector) => Selector.parse(selector),
);

/**
 * A character's AC, saves and Perception from the engine, each named by the statistic that applies: the last pack's
 * definition of its selector, as the engine chooses. The rule elements of the items the character wears, holds or has
 * invested are in play when the registry holds the item kinds; those of its ancestry, class and feats arrive with the
 * builder (Epic 3.3), and every rank is untrained.
 * A statistic no registered pack defines is left out; without a proficiency bonus table nothing can be derived.
 */
export function sheetStatistics(registry: ContentRegistry, character: Character): readonly NamedStatistic[] {
  const content = statisticContent(registry);
  if (content === undefined) {
    return [];
  }
  const rules = equippedRules(character.document, itemContent(registry), slotContent(registry));
  const results = deriveStatistics(content, statisticInputsOf(registry, character), rules);
  return SHEET_STATISTICS.flatMap((selector): NamedStatistic[] => {
    const result = results.get(selector);
    const entry = registry.statisticsFor(selector).at(-1);
    if (result === undefined || entry === undefined) {
      return [];
    }
    return [{ name: entry.definition.name, kind: entry.definition.kind, result }];
  });
}
