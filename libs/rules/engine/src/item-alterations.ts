import { FormulaValue, ReferencePath } from '@pioneer/rules/formula';
import type { ResolveReference } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import {
  ItemProperty,
  NumericAlterationMode,
  NumericItemProperty,
  RollOptionNamespace,
  RuleElementKey,
  StrikeProperty,
  TraitAlterationMode,
} from '@pioneer/rules/sdk';
import type {
  AdjustStrikeElement,
  DamageType,
  InventoryItemId,
  ItemAlterationElement,
  Level,
  Origin,
  RichText,
  RollOptionTail,
  RuleNumber,
  Slug,
  Trait,
} from '@pioneer/rules/sdk';

import { inventoryItemOf } from './rule-in-play';
import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { changed, truthOf, valueOf } from './rule-value';

/** The numbers of an item an alteration can change, by property; a property the item has no value for is absent. */
export type ItemNumbers = ReadonlyMap<NumericItemProperty, FormulaValue>;

/** What `ItemAlteration` elements read of an item and can change. */
export interface AlterableItem {
  /** The item's own roll options, without their namespace: `type:armor`, `trait:shield`, `equipped`. */
  readonly rollOptions: readonly RollOptionTail[];
  readonly numbers: ItemNumbers;
  readonly traits: readonly Trait[];
  readonly damageType: DamageType | undefined;
  readonly materials: readonly Slug[];
  readonly propertyRunes: readonly Slug[];
  /** The inventory item the weapon is, which an `etched` adjustment reads; absent for an item with no inventory line. */
  readonly inventoryItem?: InventoryItemId | undefined;
  /** The text the item reads as, when an alteration may replace it; absent for an item whose text is not altered. */
  readonly description?: RichText | undefined;
}

/** An item after the `ItemAlteration` elements in play changed it. */
export interface AlteredItem extends AlterableItem {
  /** Every element that changed something, in the order found; empty for an item no element reached. */
  readonly origins: readonly Origin[];
}

/** A rule in play whose element is an `ItemAlteration`. */
type AlterationInPlay = RuleInPlay & { readonly element: ItemAlterationElement };

/** An `ItemAlteration` of one of an item's numbers. */
type NumericAlteration = Extract<ItemAlterationElement, { readonly property: NumericItemProperty }>;

/** Where an alteration's `items` predicate reads an item's own roll options: `item:trait:shield`. */
const ITEM_NAMESPACE = RollOptionNamespace.parse('item');

/** The formula reference to the level of the item that holds the element. */
const ITEM_LEVEL_PATH = ReferencePath.parse('item.level');

/** The properties that are numbers. */
const NUMERIC_PROPERTIES: ReadonlySet<ItemProperty | NumericItemProperty> = new Set(Object.values(NumericItemProperty));

/** Modes that give an item a value it had none of: the others have nothing to add to. */
const SETTING_MODES: ReadonlySet<NumericAlterationMode> = new Set([
  NumericAlterationMode.Upgrade,
  NumericAlterationMode.Downgrade,
  NumericAlterationMode.Override,
]);

/** What a number an item lacks is set from. */
const NOTHING = FormulaValue.parse(0);

/** One numeric change: how, and by how much. */
interface NumericChange {
  readonly mode: NumericAlterationMode;
  readonly amount: RuleNumber;
}

/** `value` held to what an item's number can be: a whole number, never below 0; undefined when it is out of range. */
function held(value: FormulaValue | undefined): FormulaValue | undefined {
  return value === undefined ? undefined : FormulaValue.parse(Math.max(0, value));
}

/**
 * `current` as a numeric alteration changes it, never below 0; undefined when the result is out of range. An item
 * with no value for the property takes one from `upgrade`, `downgrade` and `override` only.
 */
function altered(current: FormulaValue | undefined, { mode, amount }: NumericChange): FormulaValue | undefined {
  if (current === undefined) {
    return SETTING_MODES.has(mode) ? held(changed(NumericAlterationMode.Override, NOTHING, amount)) : undefined;
  }
  return held(changed(mode, current, amount));
}

function isNumeric(element: ItemAlterationElement): element is NumericAlteration {
  return NUMERIC_PROPERTIES.has(element.property);
}

/** `list` with `value` added or removed; the same list when it already is or isn't there. */
function withValue<Value>(list: readonly Value[], mode: TraitAlterationMode, value: Value): readonly Value[] {
  const present = list.includes(value);
  if (mode === TraitAlterationMode.Add) {
    return present ? list : [...list, value];
  }
  return present ? list.filter((each) => each !== value) : list;
}

/** The only reference a numeric alteration reads: the level of the item that holds it (a spell effect's rank). */
function itemLevelOf(level: Level | undefined): ResolveReference {
  return (path): FormulaValue | undefined =>
    path === ITEM_LEVEL_PATH && level !== undefined ? FormulaValue.parse(level) : undefined;
}

/** `item` after an alteration of one of its numbers; the same object when it changed nothing. */
function numberAltered(
  item: AlteredItem,
  element: Pick<NumericAlteration, 'property' | 'mode' | 'value'>,
  level: Level | undefined,
): AlteredItem {
  const outcome = valueOf(element.value, itemLevelOf(level));
  if (!outcome.ok) {
    return item;
  }
  const current = item.numbers.get(element.property);
  const result = altered(current, { mode: element.mode, amount: outcome.value });
  return result === undefined || result === current
    ? item
    : { ...item, numbers: new Map(item.numbers).set(element.property, result) };
}

/** `item` after one element; the same object when the element changed nothing. */
function alteredBy(item: AlteredItem, { element, itemLevel }: AlterationInPlay): AlteredItem {
  if (isNumeric(element)) {
    return numberAltered(item, element, itemLevel);
  }
  switch (element.property) {
    case ItemProperty.Traits: {
      const traits = withValue(item.traits, element.mode, element.value);
      return traits === item.traits ? item : { ...item, traits };
    }
    case ItemProperty.Materials: {
      const materials = withValue(item.materials, element.mode, element.value);
      return materials === item.materials ? item : { ...item, materials };
    }
    case ItemProperty.PropertyRunes: {
      const propertyRunes = withValue(item.propertyRunes, element.mode, element.value);
      return propertyRunes === item.propertyRunes ? item : { ...item, propertyRunes };
    }
    case ItemProperty.Description: {
      return { ...item, description: element.value };
    }
    case ItemProperty.DamageType: {
      return item.damageType === element.value ? item : { ...item, damageType: element.value };
    }
    default: {
      return element satisfies never;
    }
  }
}

function isAlteration(rule: RuleInPlay): rule is AlterationInPlay {
  return rule.element.key === RuleElementKey.ItemAlteration;
}

/** Whether the element reaches the item: its own predicate holds, and so does the one over the item's roll options. */
function reaches({ facts }: ModifierInputs, { element }: AlterationInPlay, item: AlterableItem): boolean {
  return (
    truthOf(element.predicate, facts) === Truth.True &&
    truthOf(element.items, facts.withNamespace(ITEM_NAMESPACE, item.rollOptions)) === Truth.True
  );
}

/**
 * `item` as the `ItemAlteration` elements in play change it, in the order found. An element applies when its predicate
 * holds and its `items` predicate holds for the item's own roll options; one that depends on the situation gives
 * nothing here. Numbers are never below 0. A value that is a formula reads only `@item.level`, the level of the item that
 * holds the element (a spell effect's rank), so one that needs the
 * character's numbers has no value and changes nothing; the item's numbers are read before the character's are known.
 */
export function alterItem(inputs: ModifierInputs, item: AlterableItem): AlteredItem {
  let current: AlteredItem = { ...item, origins: [] };
  for (const rule of inputs.rules) {
    if (isAlteration(rule) && reaches(inputs, rule, current)) {
      const next = alteredBy(current, rule);
      if (next !== current) {
        current = { ...next, origins: [...current.origins, rule.origin] };
      }
    }
  }
  return current;
}

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
    case StrikeProperty.RangeIncrement: {
      return numberAltered(
        weapon,
        { property: NumericItemProperty.RangeIncrement, mode: element.mode, value: element.value },
        itemLevel,
      );
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
