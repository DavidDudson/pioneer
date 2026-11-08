import { NO_MODIFIERS } from '@pioneer/rules/engine';
import type { ArmorInputs, ModifierInputs, WeaponInputs } from '@pioneer/rules/engine';
import {
  AttributeModifier,
  CheckPenalty,
  ContentKind,
  ItemCount,
  Modifier,
  NumericItemProperty,
  RuneGrade,
  Trait,
} from '@pioneer/rules/sdk';
import type { BaseWeapon, RuleSlug, Slug } from '@pioneer/rules/sdk';

import { itemsIn, originOf } from './active-items';
import type { ActiveItem } from './active-items';
import type { Inventory, InventoryItemId } from './inventory';
import { activeState, equippedState } from './inventory-content';
import type { ItemContent } from './inventory-content';
import { alteredItem, feetOf } from './item-alteration-inputs';
import { itemRunes } from './item-runes';
import { itemSlugs, NO_PICKED_ITEMS } from './owned-items';
import type { PickedItems } from './owned-items';
import { NO_RUNES } from './rune-etching';
/** What the worn armour and held weapons give the statistics. */
export interface EquippedInputs {
  readonly armor?: ArmorInputs;
  /** The worn armour's Dexterity cap, when it has one. */
  readonly dexterityCap?: AttributeModifier;
  readonly weapons: readonly WeaponInputs[];
}

const NO_POTENCY = 0;

/** The trait of an item used up when thrown: its stack shrinks with each use. */
const CONSUMABLE = Trait.parse('consumable');

/**
 * The worn armour's bonus to AC and Dexterity cap, and while its runes work (it is invested, `activeState`) its
 * potency rune's bonus to AC and resilient rune's to saves.
 */
function armorInputs(
  active: ActiveItem | undefined,
  rules: ModifierInputs,
  picked: readonly RuleSlug[],
): Pick<EquippedInputs, 'armor' | 'dexterityCap'> {
  if (active?.entry.kind !== ContentKind.Armor) {
    return {};
  }
  const { item, entry } = active;
  const { numbers } = alteredItem(rules, entry, { picked });
  const acBonus = numbers.get(NumericItemProperty.AcBonus) ?? entry.data.acBonus;
  const dexCap = numbers.get(NumericItemProperty.DexCap);
  const checkPenalty = numbers.get(NumericItemProperty.CheckPenalty);
  const strength = numbers.get(NumericItemProperty.Strength);
  const runes = activeState(item, entry) === undefined ? NO_RUNES : itemRunes(item, entry);
  const armor = {
    bonus: Modifier.parse(acBonus + (runes.potency ?? NO_POTENCY)),
    resilient: runes.resilient,
    checkPenalty: checkPenalty === undefined || checkPenalty === 0 ? undefined : CheckPenalty.parse(checkPenalty),
    strength: strength === undefined ? undefined : AttributeModifier.parse(strength),
    origin: originOf(active),
  };
  return dexCap === undefined ? { armor } : { armor, dexterityCap: AttributeModifier.parse(dexCap) };
}

/** The rule elements in play and their facts, with the items the character's `ChoiceSet`s picked, when it knows them. */
interface PickingRules extends ModifierInputs {
  readonly picked?: PickedItems;
}

/** What else a held weapon's inputs read: the base weapons a deity favours, the rules in play, and the items' names and picks. */
interface WeaponContext {
  readonly favored: ReadonlySet<BaseWeapon>;
  readonly rules: ModifierInputs;
  /** Each inventory line's slug (`itemSlugs`). */
  readonly slugs: ReadonlyMap<InventoryItemId, Slug>;
  readonly picked: PickedItems;
}

/** Whether the deity favours the weapon whose base is `base`. */
function favoredBy(favored: ReadonlySet<BaseWeapon>, base: BaseWeapon | undefined): boolean {
  return base !== undefined && favored.has(base);
}

/**
 * Each held weapon as its Strike reads it: its potency is its rune's, or a bomb's own item bonus, and its striking
 * rune adds damage dice. One whose base the character's deity favours is marked so (ADR-0048).
 */
function weaponInputs(
  active: readonly ActiveItem[],
  { favored, rules, slugs, picked }: WeaponContext,
): readonly WeaponInputs[] {
  return active.flatMap((each): WeaponInputs[] => {
    const { entry } = each;
    if (entry.kind !== ContentKind.Weapon) {
      return [];
    }
    const slug = slugs.get(each.item.id);
    if (slug === undefined) {
      return [];
    }
    const flags = picked.get(slug);
    const runes = itemRunes(each.item, entry);
    const potency = runes.potency ?? entry.data.itemBonus;
    const altered = alteredItem(rules, entry, {
      picked: flags,
      favored: favoredBy(favored, entry.data.baseItem),
      item: each.item.id,
    });
    return [
      {
        slug,
        category: entry.data.category,
        group: entry.data.group,
        rollOptions: altered.rollOptions,
        traits: altered.traits,
        materials: altered.materials,
        propertyRunes: altered.propertyRunes,
        range: feetOf(altered, NumericItemProperty.RangeIncrement),
        reach: feetOf(altered, NumericItemProperty.Reach),
        potency: potency === undefined ? undefined : RuneGrade.parse(potency),
        striking: runes.striking,
        damage:
          altered.damageType === undefined
            ? entry.data.damage
            : { ...entry.data.damage, damageType: altered.damageType },
        splash: entry.data.splash,
        quantity: entry.traits.includes(CONSUMABLE) ? ItemCount.parse(each.item.quantity) : undefined,
        favored: favoredBy(favored, entry.data.baseItem),
        picked: flags,
        origin: originOf(each),
      },
    ];
  });
}

/** What else shapes the equipment's inputs besides the inventory and its content. */
export interface EquippedContext {
  /** The base weapons the character's deity favours (`favoredWeapons`); none when absent. */
  readonly favored?: ReadonlySet<BaseWeapon>;
  /**
   * The rule elements in play, whose `ItemAlteration`s change the equipment (`alteredItem`); none when absent. Asked
   * for only when armour or a weapon is equipped, as reading them resolves the character's grants.
   */
  readonly rules?: () => PickingRules;
}

/**
 * What the character's equipment gives its statistics: the worn armour's bonus and Dexterity cap, and a Strike for
 * each held weapon, as the `ItemAlteration` elements in play change them. These are physical benefits, so an
 * invested-trait item gives them uninvested (`equippedState`). Stowed and dropped items, and items not carried as they
 * are used, give nothing.
 */
export function equippedInputs(
  inventory: Inventory,
  content: ItemContent,
  { favored = new Set(), rules = () => NO_MODIFIERS }: EquippedContext = {},
): EquippedInputs {
  const slugs = itemSlugs(inventory, content);
  const active = itemsIn(inventory, content, equippedState);
  const worn = active.find(({ entry }) => entry.kind === ContentKind.Armor);
  const altering = active.some(({ entry }) => entry.kind === ContentKind.Armor || entry.kind === ContentKind.Weapon);
  const inPlay: PickingRules = altering ? rules() : NO_MODIFIERS;
  const picked = inPlay.picked ?? NO_PICKED_ITEMS;
  const wornSlug = worn === undefined ? undefined : slugs.get(worn.item.id);
  const wornPicks = wornSlug === undefined ? [] : (picked.get(wornSlug) ?? []);
  return {
    ...armorInputs(worn, inPlay, wornPicks),
    weapons: weaponInputs(active, { favored, rules: inPlay, slugs, picked }),
  };
}
