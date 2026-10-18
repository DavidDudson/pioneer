import { battleFormInPlay, factsUnderForm, NO_MODIFIERS } from '@pioneer/rules/engine';
import type { ArmorInputs, FormInPlay, ModifierInputs, RuleInPlay, WeaponInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution, GrantRoot, ToggleSlot } from '@pioneer/rules/grants';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import {
  AttributeModifier,
  CheckPenalty,
  ContentKind,
  Feet,
  Hardness,
  HitPoints,
  ItemCount,
  Level,
  Modifier,
  NumericItemProperty,
  OriginHopKind,
  RuneGrade,
  SlotKey,
  slugName,
  Trait,
} from '@pioneer/rules/sdk';
import type { BaseWeapon, ContentId, Origin, Slug } from '@pioneer/rules/sdk';

import { activeItems, inventoryHop, itemsIn, originOf } from './active-items';
import type { ActiveItem } from './active-items';
import type { CharacterDocument } from './character-document';
import { conditionRoots } from './conditions';
import { exclusiveEffects } from './effect-exclusivity';
import { effectRoots } from './effects';
import type { ActiveEffect } from './effects';
import { encumberedRoots } from './encumbered-roots';
import { rulesOf } from './entry-rules';
import type { Resolved } from './entry-rules';
import type { Inventory, InventoryItemId } from './inventory';
import { activeState, equippedState } from './inventory-content';
import type { ItemContent } from './inventory-content';
import { alteredItem } from './item-alteration-inputs';
import { itemRunes, workingPropertyRunes } from './item-runes';
import { NO_RUNES } from './rune-etching';
import type { SlotContent } from './slot-offer';
import { toggleStates } from './toggle-commands';
import { uniqueSlug } from './unique-slug';

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
): Pick<EquippedInputs, 'armor' | 'dexterityCap'> {
  if (active?.entry.kind !== ContentKind.Armor) {
    return {};
  }
  const { item, entry } = active;
  const { numbers } = alteredItem(rules, entry);
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

/**
 * Each held weapon as its Strike reads it: its potency is its rune's, or a bomb's own item bonus, and its striking
 * rune adds damage dice. One whose base the character's deity favours is marked so (ADR-0048).
 */
function weaponInputs(
  active: readonly ActiveItem[],
  { favored, rules }: { readonly favored: ReadonlySet<BaseWeapon>; readonly rules: ModifierInputs },
): readonly WeaponInputs[] {
  const taken = new Set<Slug>();
  return active.flatMap((each): WeaponInputs[] => {
    const { entry } = each;
    if (entry.kind !== ContentKind.Weapon) {
      return [];
    }
    const slug = uniqueSlug(slugName(entry.slug), taken);
    taken.add(slug);
    const runes = itemRunes(each.item, entry);
    const potency = runes.potency ?? entry.data.itemBonus;
    const altered = alteredItem(rules, entry);
    const range = altered.numbers.get(NumericItemProperty.RangeIncrement);
    return [
      {
        slug,
        category: entry.data.category,
        traits: altered.traits,
        materials: altered.materials,
        propertyRunes: altered.propertyRunes,
        range: range === undefined ? undefined : Feet.parse(range),
        potency: potency === undefined ? undefined : RuneGrade.parse(potency),
        striking: runes.striking,
        damage:
          altered.damageType === undefined
            ? entry.data.damage
            : { ...entry.data.damage, damageType: altered.damageType },
        splash: entry.data.splash,
        quantity: entry.traits.includes(CONSUMABLE) ? ItemCount.parse(each.item.quantity) : undefined,
        favored: entry.data.baseItem !== undefined && favored.has(entry.data.baseItem),
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
  readonly rules?: () => ModifierInputs;
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
  const active = itemsIn(inventory, content, equippedState);
  const worn = active.find(({ entry }) => entry.kind === ContentKind.Armor);
  const altering = active.some(({ entry }) => entry.kind === ContentKind.Armor || entry.kind === ContentKind.Weapon);
  const inPlay = altering ? rules() : NO_MODIFIERS;
  return { ...armorInputs(worn, inPlay), weapons: weaponInputs(active, { favored, rules: inPlay }) };
}

/** A shield the character holds: what the sheet shows beside its Strikes. */
export interface HeldShield {
  /** The inventory item that holds it, which keeps the damage it has taken. */
  readonly item: InventoryItemId;
  readonly entry: ContentId;
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
  /** Half its Hit Points, rounded down: at or below it the shield is broken. */
  readonly brokenThreshold: HitPoints;
}

const BROKEN_DIVISOR = 2;

/**
 * Each shield held, in inventory order, with its Hardness, Hit Points and Broken Threshold from its content, as the
 * `ItemAlteration` elements in `rules` change them. A reinforcing rune does not change them yet.
 */
export function heldShields(
  inventory: Inventory,
  content: ItemContent,
  rules: () => ModifierInputs = () => NO_MODIFIERS,
): readonly HeldShield[] {
  const shields = itemsIn(inventory, content, equippedState).filter(({ entry }) => entry.kind === ContentKind.Shield);
  const inPlay = shields.length === 0 ? NO_MODIFIERS : rules();
  return shields.flatMap(({ entry, item }): HeldShield[] => {
    if (entry.kind !== ContentKind.Shield) {
      return [];
    }
    const { numbers } = alteredItem(inPlay, entry);
    const hardness = Hardness.parse(numbers.get(NumericItemProperty.Hardness) ?? entry.data.hardness);
    const hitPoints = HitPoints.parse(numbers.get(NumericItemProperty.HitPointsMax) ?? entry.data.hitPoints);
    return [
      {
        entry: entry.id,
        item: item.id,
        hardness,
        hitPoints,
        brokenThreshold: HitPoints.parse(Math.floor(hitPoints / BROKEN_DIVISOR)),
      },
    ];
  });
}

/** Whether a resolved entry is in play through the inventory: an active item, or the condition its Bulk brings. */
function fromInventory(origin: Origin): boolean {
  const kind = origin.hops[0]?.kind;
  return kind === OriginHopKind.Inventory || kind === OriginHopKind.Condition || kind === OriginHopKind.Effect;
}

/** The rules in play and the facts they read, with the `RollOption` toggles the character's items offer. */
export interface EquippedRules extends ModifierInputs {
  readonly toggles: readonly ToggleSlot[];
}

/**
 * Everything the character's active items, the property runes working on them, the encumbered condition while it carries
 * too much (`encumberedRoots`) and the conditions active in its play state (`conditionRoots`) put in play, resolved with
 * the character's picks so an item's predicate sees its ancestry and class. Each entry's origin starts at its inventory
 * or condition hop; the facts are what every predicate reads.
 */
function equippedResolution(document: CharacterDocument, content: ItemContent, slots: SlotContent): GrantResolution {
  const { lookup, namespaces, rootSlots } = slots;
  const active = activeItems(document.inventory, content);
  const roots: GrantRoot[] = [
    ...active.flatMap((each) => {
      const hop = inventoryHop(each);
      return [each.entry.id, ...workingPropertyRunes(each.item, each.entry)].map((entry) => ({ entry, hop }));
    }),
    ...encumberedRoots(document, content, slots),
    ...conditionRoots(document.play.conditions),
    ...effectRoots(exclusiveEffects(document.play.effects, lookup).active),
  ];
  return resolveGrants({
    roots,
    lookup,
    level: Level.parse(document.level),
    situation: slots.situation ?? [],
    picks: new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value])),
    toggles: toggleStates(document.play.toggles),
    rootSlots,
    namespaces,
  });
}

/** An entry that is in play through the inventory or a condition, and why. */
export interface EquippedGrants {
  readonly items: readonly Resolved[];
  /** With the traits of the battle form in force, as the character's own. */
  readonly facts: PredicateFacts;
  /** The battle form in force; none when there is none. */
  readonly form: FormInPlay | undefined;
  /** The polymorph effects a newer one replaced, oldest first, so play can end them. */
  readonly replacedEffects: readonly ActiveEffect[];
}

/** What the character's active items and conditions put in play, and the facts that holds (see `equippedRules`). */
export function equippedGrants(document: CharacterDocument, content: ItemContent, slots: SlotContent): EquippedGrants {
  const resolution = equippedResolution(document, content, slots);
  const rules = rulesOf(resolution, { inventory: document.inventory, content }, fromInventory);
  const inputs = { rules, facts: resolution.facts };
  return {
    items: resolution.items.filter(({ origin }) => fromInventory(origin)),
    facts: factsUnderForm(inputs),
    form: battleFormInPlay(inputs),
    replacedEffects: exclusiveEffects(document.play.effects, slots.lookup).replaced,
  };
}

/**
 * The rule elements of the character's active items and the property runes working on them (`workingPropertyRunes`),
 * of the encumbered condition while it carries too much (`encumberedRoots`), of the conditions active in its play state
 * (`conditionRoots`), and of what they grant, each with an origin that starts at its inventory or condition hop, and
 * the facts their predicates are read against. Grants are resolved with the character's picks, so an item's
 * predicate sees its ancestry and class. Rule elements of the build itself arrive with the builder (Epic 3.3).
 */
export function equippedRules(document: CharacterDocument, content: ItemContent, slots: SlotContent): EquippedRules {
  const resolution = equippedResolution(document, content, slots);
  const toggles = resolution.toggles.filter(({ origin }) => fromInventory(origin));
  const rules = rulesOf(resolution, { inventory: document.inventory, content }, fromInventory);
  return { rules, facts: factsUnderForm({ rules, facts: resolution.facts }), toggles };
}

/**
 * The rule elements the character's build puts in play: its ancestry, heritage, class and class features, background
 * and feats, and what they grant, with the same facts as `equippedRules` so a predicate sees the build and the gear.
 * Statistics read them beside the items' (`characterStatistics`); a Hit Points feat such as Toughness is one of them.
 */
export function buildRules(
  document: CharacterDocument,
  content: ItemContent,
  slots: SlotContent,
): readonly RuleInPlay[] {
  const resolution = equippedResolution(document, content, slots);
  return rulesOf(resolution, { inventory: document.inventory, content }, (origin) => !fromInventory(origin));
}
