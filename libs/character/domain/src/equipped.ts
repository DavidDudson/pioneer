import { RuleInPlay } from '@pioneer/rules/engine';
import type { ArmorInputs, ModifierInputs, WeaponInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantRoot } from '@pioneer/rules/grants';
import {
  Attribute,
  AttributeModifier,
  ContentKind,
  Level,
  Modifier,
  Origin,
  OriginHopKind,
  RuneGrade,
  SlotKey,
  Slug,
  slugName,
  SOURCE_SLUG_MAX,
} from '@pioneer/rules/sdk';
import type { ContentId, ItemState, OriginHop } from '@pioneer/rules/sdk';

import { attributeModifiers } from './attribute-boosts';
import { Encumbrance, inventoryBulk } from './bulk';
import type { CharacterDocument } from './character-document';
import { CHARACTER_ROOT_SLOTS } from './character-slots';
import type { Inventory, InventoryItem } from './inventory';
import { activeState, equippedState } from './inventory-content';
import type { ItemContent, ItemEntry } from './inventory-content';
import type { SlotContent } from './slot-offer';

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

function armorInputs(active: ActiveItem | undefined): Pick<EquippedInputs, 'armor' | 'dexterityCap'> {
  if (active?.entry.kind !== ContentKind.Armor) {
    return {};
  }
  const { acBonus, dexCap, runes } = active.entry.data;
  const armor = { bonus: Modifier.parse(acBonus + (runes?.potency ?? NO_POTENCY)), origin: originOf(active) };
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

/** Each held weapon as its Strike reads it; its potency is its rune's, or a bomb's own item bonus. */
function weaponInputs(active: readonly ActiveItem[]): readonly WeaponInputs[] {
  const taken = new Set<Slug>();
  return active.flatMap((each): WeaponInputs[] => {
    const { entry } = each;
    if (entry.kind !== ContentKind.Weapon) {
      return [];
    }
    const slug = uniqueSlug(slugName(entry.slug), taken);
    taken.add(slug);
    const potency = entry.data.runes?.potency ?? entry.data.itemBonus;
    return [
      {
        slug,
        category: entry.data.category,
        traits: entry.traits,
        range: entry.data.range,
        potency: potency === undefined ? undefined : RuneGrade.parse(potency),
        origin: originOf(each),
      },
    ];
  });
}

/**
 * What the character's equipment gives its statistics: the worn armour's bonus and Dexterity cap, and a Strike for
 * each held weapon. These are physical benefits, so an invested-trait item gives them uninvested (`equippedState`).
 * Stowed and dropped items, and items not carried as they are used, give nothing.
 */
export function equippedInputs(inventory: Inventory, content: ItemContent): EquippedInputs {
  const active = itemsIn(inventory, content, equippedState);
  const worn = active.find(({ entry }) => entry.kind === ContentKind.Armor);
  return { ...armorInputs(worn), weapons: weaponInputs(active) };
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

/**
 * The rule elements of the character's active items, of the encumbered condition while it carries too much
 * (`encumberedRoots`), and of what they grant, each with an origin that starts at its inventory or condition hop, and
 * the facts their predicates are read against. Grants are resolved with the character's picks, so an item's
 * predicate sees its ancestry and class. Rule elements of the build itself arrive with the builder (Epic 3.3).
 */
export function equippedRules(document: CharacterDocument, content: ItemContent, slots: SlotContent): ModifierInputs {
  const { lookup, namespaces } = slots;
  const active = activeItems(document.inventory, content);
  const roots: GrantRoot[] = [
    ...active.map((each) => ({ entry: each.entry.id, hop: inventoryHop(each) })),
    ...encumberedRoots(document, content, slots),
  ];
  const resolution = resolveGrants({
    roots,
    lookup,
    level: Level.parse(document.level),
    situation: [],
    picks: new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value])),
    toggles: new Map(),
    rootSlots: CHARACTER_ROOT_SLOTS,
    namespaces,
  });
  const rules = resolution.items
    .filter(({ origin }) => fromInventory(origin))
    .flatMap(({ entry, origin, value }) =>
      entry.rules.map((element, rule) =>
        RuleInPlay.parse({ element, origin, rule, itemLevel: itemLevelOf(content, entry.id), conditionValue: value }),
      ),
    );
  return { rules, facts: resolution.facts };
}

function itemLevelOf(content: ItemContent, id: ContentId): Level | undefined {
  const level = content.get(id)?.level;
  return level === undefined ? undefined : Level.parse(level);
}
