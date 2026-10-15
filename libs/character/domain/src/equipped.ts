import { RuleInPlay } from '@pioneer/rules/engine';
import type { ArmorInputs, ModifierInputs, WeaponInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantEntry, GrantRoot, ToggleSlot } from '@pioneer/rules/grants';
import {
  Attribute,
  AttributeModifier,
  ContentKind,
  HitPoints,
  ItemCount,
  Level,
  Modifier,
  Origin,
  OriginHopKind,
  RuneGrade,
  SlotKey,
  Slug,
  slugName,
  SOURCE_SLUG_MAX,
  Trait,
} from '@pioneer/rules/sdk';
import type { BaseWeapon, ContentId, Hardness, ItemState, OriginHop } from '@pioneer/rules/sdk';

import { attributeModifiers } from './attribute-boosts';
import { Encumbrance, inventoryBulk } from './bulk';
import type { CharacterDocument } from './character-document';
import { conditionRoots } from './conditions';
import type { Inventory, InventoryItem } from './inventory';
import { activeState, equippedState } from './inventory-content';
import type { ItemContent, ItemEntry } from './inventory-content';
import { itemRunes, workingPropertyRunes } from './item-runes';
import { NO_RUNES } from './rune-etching';
import type { SlotContent } from './slot-offer';
import { toggleStates } from './toggle-commands';

/** An item that works on the character: its inventory line, its content and how it works (its origin hop's state). */
export interface ActiveItem {
  readonly item: InventoryItem;
  readonly entry: ItemEntry;
  readonly state: ItemState;
}

/** How an item is in play: equipped (its physical benefits) or active (its magic). */
type StateOf = (item: InventoryItem, entry: ItemEntry | undefined) => ItemState | undefined;

function itemsIn(inventory: Inventory, content: ItemContent, stateOf: StateOf): readonly ActiveItem[] {
  return inventory.items.flatMap((item): ActiveItem[] => {
    const entry = content.get(item.item);
    const state = stateOf(item, entry);
    return entry === undefined || state === undefined ? [] : [{ item, entry, state }];
  });
}

/** The items whose magic works on the character, in inventory order (`activeState`). */
export function activeItems(inventory: Inventory, content: ItemContent): readonly ActiveItem[] {
  return itemsIn(inventory, content, activeState);
}

function inventoryHop({ item, state }: ActiveItem): OriginHop {
  return { kind: OriginHopKind.Inventory, item: item.id, state };
}

/** Why an active item is on the character: its entry, reached through the inventory. */
function originOf(active: ActiveItem): Origin {
  return Origin.parse({ hops: [inventoryHop(active)], entry: active.entry.id, sources: active.entry.sources });
}

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
function armorInputs(active: ActiveItem | undefined): Pick<EquippedInputs, 'armor' | 'dexterityCap'> {
  if (active?.entry.kind !== ContentKind.Armor) {
    return {};
  }
  const { item, entry } = active;
  const { acBonus, dexCap, checkPenalty, strength } = entry.data;
  const runes = activeState(item, entry) === undefined ? NO_RUNES : itemRunes(item, entry);
  const armor = {
    bonus: Modifier.parse(acBonus + (runes.potency ?? NO_POTENCY)),
    resilient: runes.resilient,
    checkPenalty,
    strength,
    origin: originOf(active),
  };
  return dexCap === undefined ? { armor } : { armor, dexterityCap: AttributeModifier.parse(dexCap) };
}

/** Room left in a weapon's slug for the `-<n>` that tells two of the same weapon apart. */
const SUFFIX_ROOM = 4;

/**
 * `name`, or `name-2`, `name-3` for the second and third of the same weapon. A name too long to be a source slug is
 * cut short, leaving room for the count.
 */
function uniqueSlug(name: Slug, taken: ReadonlySet<Slug>): Slug {
  if (name.length <= SOURCE_SLUG_MAX && !taken.has(name)) {
    return name;
  }
  const base = name.slice(0, SOURCE_SLUG_MAX - SUFFIX_ROOM).replace(/-+$/u, '');
  let slug = Slug.parse(base);
  for (let count = 2; taken.has(slug); count += 1) {
    slug = Slug.parse(`${base}-${count}`);
  }
  return slug;
}

/**
 * Each held weapon as its Strike reads it: its potency is its rune's, or a bomb's own item bonus, and its striking
 * rune adds damage dice. One whose base the character's deity favours is marked so (ADR-0048).
 */
function weaponInputs(active: readonly ActiveItem[], favored: ReadonlySet<BaseWeapon>): readonly WeaponInputs[] {
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
    return [
      {
        slug,
        category: entry.data.category,
        traits: entry.traits,
        range: entry.data.range,
        potency: potency === undefined ? undefined : RuneGrade.parse(potency),
        striking: runes.striking,
        damage: entry.data.damage,
        splash: entry.data.splash,
        quantity: entry.traits.includes(CONSUMABLE) ? ItemCount.parse(each.item.quantity) : undefined,
        favored: entry.data.baseItem !== undefined && favored.has(entry.data.baseItem),
        origin: originOf(each),
      },
    ];
  });
}

/**
 * What the character's equipment gives its statistics: the worn armour's bonus and Dexterity cap, and a Strike for
 * each held weapon. These are physical benefits, so an invested-trait item gives them uninvested (`equippedState`).
 * Stowed and dropped items, and items not carried as they are used, give nothing. `favored` are the base weapons the
 * character's deity favours (`favoredWeapons`).
 */
export function equippedInputs(
  inventory: Inventory,
  content: ItemContent,
  favored: ReadonlySet<BaseWeapon> = new Set(),
): EquippedInputs {
  const active = itemsIn(inventory, content, equippedState);
  const worn = active.find(({ entry }) => entry.kind === ContentKind.Armor);
  return { ...armorInputs(worn), weapons: weaponInputs(active, favored) };
}

/** A shield the character holds: what the sheet shows beside its Strikes. */
export interface HeldShield {
  readonly entry: ContentId;
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
  /** Half its Hit Points, rounded down: at or below it the shield is broken. */
  readonly brokenThreshold: HitPoints;
}

const BROKEN_DIVISOR = 2;

/**
 * Each shield held, in inventory order, with its Hardness, Hit Points and Broken Threshold from its content. A
 * reinforcing rune does not change them yet.
 */
export function heldShields(inventory: Inventory, content: ItemContent): readonly HeldShield[] {
  return itemsIn(inventory, content, equippedState).flatMap(({ entry }): HeldShield[] => {
    if (entry.kind !== ContentKind.Shield) {
      return [];
    }
    const { hardness, hitPoints } = entry.data;
    return [
      {
        entry: entry.id,
        hardness,
        hitPoints,
        brokenThreshold: HitPoints.parse(Math.floor(hitPoints / BROKEN_DIVISOR)),
      },
    ];
  });
}

/** The encumbered condition, by its name within its kind. */
const ENCUMBERED = Slug.parse('encumbered');

function conditionNamed(lookup: ContentLookup, name: Slug): ContentId | undefined {
  return lookup.ofKind(ContentKind.Condition).findLast((entry) => entry.slug === name)?.id;
}

/**
 * The encumbered condition as a root with a condition hop while the character carries more Bulk than 5 plus its
 * Strength modifier (`inventoryBulk`); none while it doesn't, or while no loaded pack has the condition. The last
 * pack's entry wins, as in the registry.
 */
function encumberedRoots(document: CharacterDocument, content: ItemContent, slots: SlotContent): readonly GrantRoot[] {
  const strength = attributeModifiers(document, slots.boosts).get(Attribute.Strength);
  const { encumbrance } = inventoryBulk(document.inventory, content, strength);
  const condition = conditionNamed(slots.lookup, ENCUMBERED);
  if (encumbrance === Encumbrance.Unencumbered || condition === undefined) {
    return [];
  }
  return [{ entry: condition, hop: { kind: OriginHopKind.Condition, condition } }];
}

/** Whether a resolved entry is in play through the inventory: an active item, or the condition its Bulk brings. */
function fromInventory(origin: Origin): boolean {
  const kind = origin.hops[0]?.kind;
  return kind === OriginHopKind.Inventory || kind === OriginHopKind.Condition;
}

/** The rules in play and the facts they read, with the `RollOption` toggles the character's items offer. */
export interface EquippedRules extends ModifierInputs {
  readonly toggles: readonly ToggleSlot[];
}

/**
 * The rule elements of the character's active items and the property runes working on them (`workingPropertyRunes`),
 * of the encumbered condition while it carries too much (`encumberedRoots`), of the conditions active in its play state
 * (`conditionRoots`), and of what they grant, each with an origin that starts at its inventory or condition hop, and
 * the facts their predicates are read against. Grants are resolved with the character's picks, so an item's
 * predicate sees its ancestry and class. Rule elements of the build itself arrive with the builder (Epic 3.3).
 */
export function equippedRules(document: CharacterDocument, content: ItemContent, slots: SlotContent): EquippedRules {
  const { lookup, namespaces, rootSlots } = slots;
  const active = activeItems(document.inventory, content);
  const roots: GrantRoot[] = [
    ...active.flatMap((each) => {
      const hop = inventoryHop(each);
      return [each.entry.id, ...workingPropertyRunes(each.item, each.entry)].map((entry) => ({ entry, hop }));
    }),
    ...encumberedRoots(document, content, slots),
    ...conditionRoots(document.play.conditions),
  ];
  const resolution = resolveGrants({
    roots,
    lookup,
    level: Level.parse(document.level),
    situation: [],
    picks: new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value])),
    toggles: toggleStates(document.play.toggles),
    rootSlots,
    namespaces,
  });
  const rules = resolution.items
    .filter(({ origin }) => fromInventory(origin))
    .flatMap(({ entry, origin, value }) =>
      entry.rules.map((element, rule) =>
        RuleInPlay.parse({
          element,
          origin,
          rule,
          itemLevel: itemLevelOf(content, document.inventory, { entry, origin }),
          conditionValue: value,
        }),
      ),
    );
  const toggles = resolution.toggles.filter(({ origin }) => fromInventory(origin));
  return { rules, facts: resolution.facts, toggles };
}

/** An entry grants put in play, and why. */
interface Resolved {
  readonly entry: GrantEntry;
  readonly origin: Origin;
}

/**
 * The level `@item.level` reads in an entry's rule elements: the item's own, or for a property rune the level of the
 * item it is etched onto, as Foundry pf2e keeps a rune's rules on that item.
 */
function itemLevelOf(content: ItemContent, inventory: Inventory, { entry, origin }: Resolved): Level | undefined {
  const [hop] = origin.hops;
  const host = hop?.kind === OriginHopKind.Inventory ? inventory.items.find((each) => each.id === hop.item) : undefined;
  const id = entry.kind === ContentKind.Rune && host !== undefined ? host.item : entry.id;
  const level = content.get(id)?.level;
  return level === undefined ? undefined : Level.parse(level);
}
