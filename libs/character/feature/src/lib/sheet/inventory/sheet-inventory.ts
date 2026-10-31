import {
  activeState,
  CarryState,
  hasRunes,
  INVENTORY_KINDS,
  inventoryViolations,
  isContainer,
  isSpecific,
  itemRunes,
  partitionApproved,
} from '@pioneer/character/domain';
import type {
  Inventory,
  InventoryItem,
  InventoryItemId,
  ItemContent,
  ItemEntry,
  RuneContent,
  RunedContent,
} from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ContentKind, FundamentalRune } from '@pioneer/rules/sdk';
import { InventoryPlacement } from '@pioneer/rules/ui';
import type { GradedRune, GradedRuneLine, InventoryGroup, InventoryLine, LineRunes } from '@pioneer/rules/ui';

import { CORE_TABLE } from '../../data/character-rule-limit-store';
import type { TableRules } from '../../data/character-rule-limit-store';
import { reasonsByItem } from './sheet-violations';

/** The kinds the inventory section reads: those a character carries, and the runes etched onto them. */
export const INVENTORY_CONTENT_KINDS: readonly ContentKind[] = [...INVENTORY_KINDS, ContentKind.Rune];

/** The groups in sheet order. */
const STATES: readonly CarryState[] = [CarryState.Worn, CarryState.Held, CarryState.Stowed, CarryState.Dropped];

const GROUP_OF: Readonly<Record<CarryState, InventoryPlacement>> = {
  [CarryState.Worn]: InventoryPlacement.Worn,
  [CarryState.Held]: InventoryPlacement.Held,
  [CarryState.Stowed]: InventoryPlacement.Stowed,
  [CarryState.Dropped]: InventoryPlacement.Dropped,
};

/** What each container holds, by the container's id. */
function contentsByContainer(items: readonly InventoryItem[]): ReadonlyMap<InventoryItemId, readonly InventoryItem[]> {
  const contents = new Map<InventoryItemId, InventoryItem[]>();
  for (const each of items) {
    if (each.container !== undefined) {
      contents.set(each.container, [...(contents.get(each.container) ?? []), each]);
    }
  }
  return contents;
}

/** The fundamental runes an item's name gives by grade, in the order the rules write them. */
const GRADED_RUNES: readonly GradedRune[] = [
  FundamentalRune.Striking,
  FundamentalRune.Resilient,
  FundamentalRune.Reinforcing,
];

/**
 * The runes `item`'s name reads: its potency, its other fundamental runes by grade, and its property runes by name, a
 * rune no loaded pack has left out. None for an item with no runes, or a specific item, whose name has them.
 */
export function lineRunes(
  item: InventoryItem,
  entry: ItemEntry | undefined,
  runes: RuneContent,
): LineRunes | undefined {
  const etched = itemRunes(item, entry);
  if (isSpecific(entry) || !hasRunes(etched)) {
    return undefined;
  }
  return {
    potency: etched.potency,
    fundamental: GRADED_RUNES.flatMap((rune): GradedRuneLine[] => {
      const grade = etched[rune];
      return grade === undefined ? [] : [{ rune, grade }];
    }),
    property: etched.property.flatMap((id) => {
      const name = runes.get(id)?.name;
      return name === undefined ? [] : [name];
    }),
  };
}

/** The table's rules, and whether a battle form has the worn and held gear melded into it (#532). */
export type InventoryRules = TableRules & { readonly melded?: boolean };

/**
 * The inventory as the sheet lists it: loose items grouped worn, held, stowed and dropped as they are carried, each
 * container with what it holds beneath it, and each item named with its runes. Empty groups are left out.
 */
export function sheetInventory(
  inventory: Inventory,
  { items, runes }: RunedContent,
  { limits, approvals, campaign, melded = false }: InventoryRules = CORE_TABLE,
): readonly InventoryGroup[] {
  const contents = contentsByContainer(inventory.items);
  const { open, approved } = partitionApproved(inventoryViolations(inventory, { items, runes }, limits), approvals);
  const breaks = reasonsByItem(open, runes);
  const approvedBreaks = reasonsByItem(approved, runes);
  const lineOf = (item: InventoryItem): InventoryLine => {
    const entry = items.get(item.item);
    return {
      id: item.id,
      content: item.item,
      name: item.name ?? entry?.name,
      contentName: item.name === undefined ? undefined : entry?.name,
      quantity: item.quantity,
      bulk: entry?.data.bulk,
      bulkPer: entry?.data.bulkPer,
      hands: item.carry.state === CarryState.Held ? item.carry.hands : undefined,
      invested: item.invested === true,
      melded: melded && activeState(item, entry) !== undefined,
      runes: lineRunes(item, entry, runes),
      breaks: breaks.get(item.id) ?? [],
      approved: approvedBreaks.get(item.id) ?? [],
      keyItem: item.keyItem !== undefined,
      keyItemLink:
        item.keyItem === undefined || campaign === undefined ? undefined : ['/campaigns', campaign, 'inventory'],
      contents: (contents.get(item.id) ?? []).map((inside) => lineOf(inside)),
    };
  };
  const loose = inventory.items.filter((each) => each.container === undefined);
  return STATES.map((state) => ({
    placement: GROUP_OF[state],
    lines: loose.filter((each) => each.carry.state === state).map((each) => lineOf(each)),
  })).filter((group) => group.lines.length > 0);
}

/** The value of the "carried loose" option where an item can be put. */
export const LOOSE = '';

/**
 * Where an item can go: every container the character has, by its name, less `moving` and whatever it holds, so a
 * container is never offered a place inside itself. Undefined `moving` is a new item.
 */
export function containerOptions(
  inventory: Inventory,
  content: ItemContent,
  moving: InventoryItemId | undefined,
): readonly SelectOption<string>[] {
  const excluded = moving === undefined ? new Set<InventoryItemId>() : heldBy(inventory.items, moving);
  return inventory.items
    .filter((each) => isContainer(content.get(each.item)) && !excluded.has(each.id))
    .map((each) => ({ value: each.id, label: each.name ?? content.get(each.item)?.name ?? each.id }));
}

/** `id` and everything inside it, however deep. */
function heldBy(items: readonly InventoryItem[], id: InventoryItemId): ReadonlySet<InventoryItemId> {
  const held = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const each of items) {
      if (each.container !== undefined && held.has(each.container) && !held.has(each.id)) {
        held.add(each.id);
        grew = true;
      }
    }
  }
  return held;
}
