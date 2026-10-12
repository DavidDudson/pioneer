import { equippedRules, itemContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { deriveStatistics, statisticContent } from '@pioneer/rules/engine';
import type { WeaponInputs } from '@pioneer/rules/engine';
import { OriginHopKind, Selector } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { StatisticsMessage } from '@pioneer/rules/ui';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';

/** The family each weapon's Strike is derived under: `strike:<weapon slug>`. */
const STRIKE = Selector.parse('strike');

/** How a Strike is named: a held weapon by its item's name, a fist a feature gives by its message key. */
type StrikeName = Pick<NamedStatistic, 'name' | 'nameKey'>;

function weaponName(weapon: WeaponInputs, nameOf: (entry: ContentId) => string | undefined): StrikeName {
  const held = weapon.origin.hops[0]?.kind === OriginHopKind.Inventory;
  return held
    ? { name: nameOf(weapon.origin.entry) ?? weapon.slug }
    : { name: weapon.slug, nameKey: StatisticsMessage.Fist };
}

/**
 * A character's Strikes from the engine (#598), in the order the engine reads its weapons: each held weapon's, then
 * those its features give, a fist. The rule elements of the items it wears, holds or has invested are in play, as for
 * the sheet's other statistics. None without a Strike definition or a proficiency bonus table.
 */
export function sheetStrikes(registry: ContentRegistry, character: Character): readonly NamedStatistic[] {
  const content = statisticContent(registry);
  const definition = registry.statisticsFor(STRIKE).at(-1)?.definition;
  const inputs = statisticInputsOf(registry, character);
  const weapons = inputs.weapons ?? [];
  if (content === undefined || definition === undefined || weapons.length === 0) {
    return [];
  }
  const slots = sheetSlotContent(registry);
  const nameOf = (entry: ContentId): string | undefined => slots.lookup.entry(entry)?.name;
  const rules = equippedRules(character.document, itemContent(registry), slots);
  const results = deriveStatistics(content, inputs, rules);
  return weapons.flatMap((weapon): NamedStatistic[] => {
    const result = results.get(Selector.parse(`${STRIKE}:${weapon.slug}`));
    return result === undefined ? [] : [{ ...weaponName(weapon, nameOf), kind: definition.kind, result }];
  });
}
