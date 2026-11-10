import { Truth } from '@pioneer/rules/predicate';
import {
  NumericItemProperty,
  RollOptionNamespace,
  RuleElementKey,
  StrikeProperty,
  TraitAlterationMode,
} from '@pioneer/rules/sdk';
import type { AdjustStrikeElement } from '@pioneer/rules/sdk';

import { numberAltered, withValue } from './item-alterations';
import type { AlterableItem, AlteredItem } from './item-alterations';
import { inventoryItemOf } from './rule-in-play';
import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';

/** Where an adjustment's `strikes` predicate reads a weapon's own roll options: `item:group:sword`. */
const ITEM_NAMESPACE = RollOptionNamespace.parse('item');

/** A rule in play whose element is an `AdjustStrike`. */
type AdjustmentInPlay = RuleInPlay & { readonly element: AdjustStrikeElement };

function isAdjustment(rule: RuleInPlay): rule is AdjustmentInPlay {
  return rule.element.key === RuleElementKey.AdjustStrike;
}

/**
 * Whether the adjustment reaches the weapon: its own predicate holds, so does `strikes` over the weapon's roll options,
 * and an `etched` one comes from the inventory item the weapon is.
 */
function reachesStrike({ facts }: ModifierInputs, { element, origin }: AdjustmentInPlay, item: AlterableItem): boolean {
  const owned =
    element.etched !== true || (item.inventoryItem !== undefined && item.inventoryItem === inventoryItemOf(origin));
  return (
    owned &&
    truthOf(element.predicate, facts) === Truth.True &&
    truthOf(element.strikes, facts.withNamespace(ITEM_NAMESPACE, item.rollOptions)) === Truth.True
  );
}

/** `weapon` after one adjustment; the same object when it changed nothing. */
function adjustedBy(weapon: AlteredItem, { element, itemLevel }: AdjustmentInPlay): AlteredItem {
  switch (element.property) {
    case StrikeProperty.Traits: {
      const traits = withValue(weapon.traits, element.mode, element.value);
      return traits === weapon.traits ? weapon : { ...weapon, traits };
    }
    case StrikeProperty.Materials: {
      const materials = withValue(weapon.materials, TraitAlterationMode.Add, element.value);
      return materials === weapon.materials ? weapon : { ...weapon, materials };
    }
    case StrikeProperty.PropertyRunes: {
      const propertyRunes = withValue(weapon.propertyRunes, TraitAlterationMode.Add, element.value);
      return propertyRunes === weapon.propertyRunes ? weapon : { ...weapon, propertyRunes };
    }
    case StrikeProperty.RangeIncrement:
    case StrikeProperty.Reach: {
      const reach = element.property === StrikeProperty.Reach;
      const property = reach ? NumericItemProperty.Reach : NumericItemProperty.RangeIncrement;
      return numberAltered(weapon, { property, mode: element.mode, value: element.value }, itemLevel);
    }
    default: {
      return element satisfies never;
    }
  }
}

/**
 * `weapon` as the `AdjustStrike` elements in play change its Strike, in the order found. An element applies when its
 * predicate holds and its `strikes` predicate holds for the weapon's own roll options (all weapons when absent); an
 * `etched` element reaches only the weapon of the inventory item it comes from. Range
 * increments follow the numeric rules of `alterItem`; a value that is a formula reads only `@item.level`. `origins`
 * keeps what `weapon` already had and adds each element that changed something.
 */
export function adjustStrike(inputs: ModifierInputs, weapon: AlteredItem): AlteredItem {
  let current = weapon;
  for (const rule of inputs.rules) {
    if (isAdjustment(rule) && reachesStrike(inputs, rule, current)) {
      const next = adjustedBy(current, rule);
      if (next !== current) {
        current = { ...next, origins: [...current.origins, rule.origin] };
      }
    }
  }
  return current;
}
