import { characterStrikeRules, equippedRules, heldShields, itemContent } from '@pioneer/character/domain';
import type { Character, TurnState } from '@pioneer/character/domain';
import { deriveStrikes } from '@pioneer/rules/engine';
import type { ModifierInputs, WeaponInputs } from '@pioneer/rules/engine';
import { ActionCost, OriginHopKind, Selector } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { StatisticsMessage } from '@pioneer/rules/ui';
import type { NamedStrike, StrikesShield } from '@pioneer/rules/ui';

import { affordability } from './sheet-actions';
import { traitNames } from './sheet-build';
import { statisticInputsOf } from './sheet-inputs';
import { checkSituations, NO_CLAIMS } from './sheet-situations';
import type { SituationClaims } from './sheet-situations';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetSources } from './sheet-sources';
import { sheetDerivation } from './sheet-statistics';

/** The family each weapon's Strike is derived under: `strike:<weapon slug>`. */
const STRIKE = Selector.parse('strike');

/** How a Strike is named: a held weapon by its item's name, a fist a feature gives by its message key. */
type StrikeName = Pick<NamedStrike, 'name' | 'nameKey'>;

function weaponName(weapon: WeaponInputs, nameOf: (entry: ContentId) => string | undefined): StrikeName {
  const held = weapon.origin.hops[0]?.kind === OriginHopKind.Inventory;
  if (held) {
    return { name: nameOf(weapon.origin.entry) ?? weapon.slug };
  }
  return weapon.label === undefined ? { name: weapon.slug, nameKey: StatisticsMessage.Fist } : { name: weapon.label };
}

/**
 * A character's Strikes from the engine (#598, #481), in the order the engine reads its weapons: each held weapon's,
 * then those its features give, a fist or an attack of their own, from the sheet's one derivation
 * (`sheetDerivation`). Each carries its attack roll, its damage and its multiple attack penalty (`deriveStrikes`),
 * with the situations `claims` holds for its attack counted (#798) and the conditional lines it offers to claim.
 * None without a Strike definition.
 */
export function sheetStrikes(
  registry: ContentRegistry,
  character: Character,
  claims: SituationClaims = NO_CLAIMS,
): readonly NamedStrike[] {
  const definition = registry.statisticsFor(STRIKE).at(-1)?.definition;
  const weapons = statisticInputsOf(registry, character).weapons ?? [];
  if (definition === undefined || weapons.length === 0) {
    return [];
  }
  const slots = sheetSlotContent(registry);
  const nameOf = (entry: ContentId): string | undefined => slots.lookup.entry(entry)?.name;
  const rules = characterStrikeRules(sheetSources(registry, character), character.document);
  const strikes = deriveStrikes(weapons, sheetDerivation(registry, character), rules);
  const traits = traitNames(registry);
  const selectors = strikes.flatMap(({ attack }) => (attack?.ok === true ? [attack.selector] : []));
  const found = checkSituations(registry, character, { selectors, claims });
  return strikes.flatMap((strike): NamedStrike[] => {
    if (strike.attack === undefined) {
      return [];
    }
    const check = strike.attack.ok ? found.get(strike.attack.selector) : undefined;
    return [
      {
        ...weaponName(strike.weapon, nameOf),
        traits: strike.weapon.traits.map((trait) => traits.get(trait) ?? trait),
        strike: check === undefined ? strike : { ...strike, attack: check.statistic },
        situations: check?.situations,
      },
    ];
  });
}

/** The shields the character holds, by name, with their Hardness, Hit Points and Broken Threshold (`heldShields`). */
export function sheetShields(registry: ContentRegistry, character: Character): readonly StrikesShield[] {
  const slots = sheetSlotContent(registry);
  const items = itemContent(registry);
  const rules = (): ModifierInputs => equippedRules(character.document, items, slots);
  return heldShields(character.document.inventory, items, rules).map(
    ({ entry, hardness, hitPoints, brokenThreshold }): StrikesShield => ({
      name: slots.lookup.entry(entry)?.name ?? entry,
      hardness,
      hitPoints,
      brokenThreshold,
    }),
  );
}

/** The Strikes of `strikes` with what using each spends: its weapon, one action, and what `turn` leaves to pay it. */
export function usableStrikes(strikes: readonly NamedStrike[], turn: TurnState | undefined): readonly NamedStrike[] {
  return strikes.map((named): NamedStrike => ({
    ...named,
    use: {
      id: named.strike.weapon.origin.entry,
      name: named.name,
      cost: ActionCost.One,
      attack: true,
      ...affordability(turn, ActionCost.One, undefined),
    },
  }));
}
