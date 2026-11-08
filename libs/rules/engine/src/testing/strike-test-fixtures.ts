import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from '../derive-statistics';
import { StatisticInputsJson } from '../statistic-inputs';
import { deriveStrikes } from '../strikes';
import type { Strike } from '../strikes';
import { inPlay, wielded } from './builders';

export const DEFINITIONS = [
  StatisticDefinition.parse({
    slug: 'statistic:strike',
    name: 'Strike',
    selector: 'strike',
    domains: ['check', 'attack-roll', 'strike-attack-roll'],
    base: '@weapon.attr + @weapon.prof',
    kind: StatisticKind.Check,
    per: 'weapon',
  }),
  StatisticDefinition.parse({
    slug: 'statistic:strike-damage',
    name: 'Strike Damage',
    selector: 'strike-damage',
    domains: ['damage', 'strike-damage'],
    base: '@weapon.damage',
    kind: StatisticKind.Value,
    per: 'weapon',
  }),
];
export const LONGSWORD = {
  slug: 'longsword',
  category: 'martial',
  traits: [],
  damage: { dice: 1, die: 'd8', damageType: 'slashing' },
};

/**
 * The first Strike of a level 5 character wielding `weapon` (the inventory item `weaponItem`, when given), with `placed`
 * rule elements in play; a third entry in a placed tuple is the inventory item the element comes from, as for a rune.
 */
export function strikeOf(
  placed: readonly (readonly [object, string, string?])[],
  weapon: { readonly slug: string } = LONGSWORD,
  weaponItem?: string,
): Strike | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained', 'attack:simple': 'trained' },
    weapons: [wielded(weapon, weaponItem)],
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);
  const rules = placed.map(([element, entry, item], rule) =>
    inPlay(element, entry, item === undefined ? { rule } : { rule, item }),
  );
  const modifiers = { rules, facts };
  const results = deriveStatistics(content, inputs, modifiers);
  return deriveStrikes(inputs.weapons ?? [], results, {
    inputs: modifiers,
    scope: { statistics: content, character: inputs },
  })[0];
}
