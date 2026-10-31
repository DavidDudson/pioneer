import { alterItem } from '@pioneer/rules/engine';
import type { AlteredItem, ItemNumbers, ModifierInputs } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import { ContentKind, NumericItemProperty, RollOptionTail, slugName } from '@pioneer/rules/sdk';
import type { DamageType, RuleSlug, Slug } from '@pioneer/rules/sdk';

import type { ItemEntry } from './inventory-content';

/** Every item `ItemAlteration` elements reach is equipped: `item:equipped` holds. */
const EQUIPPED = RollOptionTail.parse('equipped');

/** A number of an item that may be missing, by the property an alteration names it by. */
type Candidates = readonly (readonly [NumericItemProperty, number | undefined])[];

/** The numbers among `candidates` the item has. */
function numbers(candidates: Candidates): ItemNumbers {
  return new Map(
    candidates.flatMap(([property, value]) => (value === undefined ? [] : [[property, FormulaValue.parse(value)]])),
  );
}

/** The numbers an item's content gives that an alteration can change; a number it lacks is absent. */
function numbersOf(entry: ItemEntry): ItemNumbers {
  const { AcBonus, CheckPenalty, DexCap, Hardness, HitPointsMax, RangeIncrement, SpeedPenalty, Strength } =
    NumericItemProperty;
  switch (entry.kind) {
    case ContentKind.Armor: {
      const { data } = entry;
      return numbers([
        [AcBonus, data.acBonus],
        [CheckPenalty, data.checkPenalty],
        [DexCap, data.dexCap],
        [Hardness, data.hardness],
        [HitPointsMax, data.hitPoints],
        [SpeedPenalty, data.speedPenalty],
        [Strength, data.strength],
      ]);
    }
    case ContentKind.Shield: {
      const { data } = entry;
      return numbers([
        [AcBonus, data.acBonus],
        [Hardness, data.hardness],
        [HitPointsMax, data.hitPoints],
        [SpeedPenalty, data.speedPenalty],
      ]);
    }
    case ContentKind.Weapon: {
      const { data } = entry;
      return numbers([
        [Hardness, data.hardness],
        [HitPointsMax, data.hitPoints],
        [RangeIncrement, data.range],
      ]);
    }
    case ContentKind.Consumable:
    case ContentKind.Equipment:
    case ContentKind.Treasure: {
      return numbers([]);
    }
    default: {
      return entry satisfies never;
    }
  }
}

function damageTypeOf(entry: ItemEntry): DamageType | undefined {
  return entry.kind === ContentKind.Weapon ? entry.data.damage.damageType : undefined;
}

function materialsOf(entry: ItemEntry): readonly Slug[] {
  const material = 'material' in entry.data ? entry.data.material : undefined;
  return material === undefined ? [] : [material.type];
}

/** The roll options of an equipped item that a predicate over `item:` reads: `type:armor`, `trait:shield`, `slug:…`. */
function rollOptionsOf(entry: ItemEntry): readonly RollOptionTail[] {
  return [
    RollOptionTail.parse(`type:${entry.kind}`),
    RollOptionTail.parse(`slug:${slugName(entry.slug)}`),
    ...entry.traits.map((trait) => RollOptionTail.parse(`trait:${trait}`)),
    EQUIPPED,
  ];
}

/**
 * An equipped item's content as the `ItemAlteration` elements in play change it (`alterItem`): its numbers (armour's
 * bonus, Dexterity cap, check penalty and Strength, a shield's Hardness and Hit Points, a weapon's range increment),
 * its traits and damage type, and the materials and property runes the elements add to what its content names.
 */
export function alteredItem(rules: ModifierInputs, entry: ItemEntry, picked: readonly RuleSlug[] = []): AlteredItem {
  return alterItem(rules, {
    rollOptions: [...rollOptionsOf(entry), ...picked.map((flag) => RollOptionTail.parse(`picked:${flag}`))],
    numbers: numbersOf(entry),
    traits: entry.traits,
    damageType: damageTypeOf(entry),
    materials: materialsOf(entry),
    propertyRunes: [],
  });
}
