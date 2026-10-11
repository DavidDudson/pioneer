import { characterGrants, characterSpellcasting, equippedRules, itemContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { deriveStatistics, statisticContent } from '@pioneer/rules/engine';
import type { StatisticResult } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry, Origin } from '@pioneer/rules/sdk';
import type { NamedStatistic, SlotPoolLine, SpellcastingEntryLine } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';

/** The statistic families each spellcasting entry derives, in the order the sheet lists them. */
const FAMILIES: readonly Selector[] = ['spell-attack', 'spell-dc'].map((family) => Selector.parse(family));

/**
 * A character's spellcasting entries, each with its spell attack and spell DC from the engine, its slots and pools, named by the family that
 * applies (the last pack's definition), and the name of the entry that gave it. The rule elements of the items it wears,
 * holds or has invested are in play, as for the sheet's other statistics. A family no registered pack defines is
 * left out; without a proficiency bonus table nothing can be derived, so there are no entries to show either.
 */
export function sheetSpellcasting(registry: ContentRegistry, character: Character): readonly SpellcastingEntryLine[] {
  const content = statisticContent(registry);
  if (content === undefined) {
    return [];
  }
  const slots = sheetSlotContent(registry);
  const entries = characterSpellcasting(characterGrants(character.document, slots));
  const results: ReadonlyMap<Selector, StatisticResult> =
    entries.length === 0
      ? new Map()
      : deriveStatistics(
          content,
          statisticInputsOf(registry, character),
          equippedRules(character.document, itemContent(registry), slots),
        );
  const nameOf = (origin: Origin): string => slots.lookup.entry(origin.entry)?.name ?? origin.entry;
  return entries.map(({ slug, tradition, preparation, origin, slots: own, pools }) => ({
    key: slug,
    tradition,
    preparation,
    source: nameOf(origin),
    slots: own,
    pools: pools.map((pool): SlotPoolLine => ({ key: pool.pool, source: nameOf(pool.origin), slots: pool })),
    statistics: FAMILIES.flatMap((family): NamedStatistic[] => {
      const result = results.get(Selector.parse(`${family}:${slug}`));
      const definition = registry.statisticsFor(family).at(-1)?.definition;
      return result === undefined || definition === undefined
        ? []
        : [{ name: definition.name, kind: definition.kind, result }];
    }),
  }));
}
