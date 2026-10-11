import { ContentKind, EtchingRestriction, FUNDAMENTAL_RUNE_ITEMS, RuneType } from '@pioneer/rules/sdk';
import type { ContentId, RunedItem } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { InventoryRefusalField } from './inventory';
import type { Inventory, InventoryItem, InventoryItemId, InventoryRefusal } from './inventory';
import type { ItemEntry } from './inventory-content';
import { isSpecific, itemRunes, printedRunes, propertyRoom, runedItemOf } from './item-runes';
import type { RunedContent, RuneContent } from './item-runes';
import { etchingOf, RuneAction } from './rune-edits';
import type { RuneEdit } from './rune-edits';
import { NO_RUNES } from './rune-etching';
import type { RuneEtching, RuneRef } from './rune-etching';

function runeRefused(refusal: MessageDescriptor): InventoryRefusal {
  return { field: InventoryRefusalField.Rune, message: refusal };
}

/** The item a rune edit reads: its inventory line, its content, and what that is as runes read it. */
interface RunedLine {
  readonly item: InventoryItem;
  readonly entry: ItemEntry | undefined;
  readonly runed: RunedItem | undefined;
}

function runedLine(content: RunedContent, inventory: Inventory, id: InventoryItemId): RunedLine | undefined {
  const item = inventory.items.find((each) => each.id === id);
  if (item === undefined) {
    return undefined;
  }
  const entry = content.items.get(item.item);
  return { item, entry, runed: runedItemOf(entry) };
}

/** A fundamental rune to etch. */
type FundamentalEtching = Extract<RuneEtching, { readonly type: typeof RuneType.Fundamental }>;

/**
 * Refuses a fundamental rune that doesn't go on the item, or no higher than a specific item has. Its grade is in range
 * already (`RuneEtchingSchema`).
 */
function fundamentalRefusal(
  { entry, runed }: RunedLine,
  { rune, grade }: FundamentalEtching,
): InventoryRefusal | undefined {
  if (runed === undefined || !FUNDAMENTAL_RUNE_ITEMS[rune].includes(runed)) {
    return runeRefused(message('character.validation.runeNotForItem'));
  }
  const printed = printedRunes(entry)?.[rune];
  return printed !== undefined && grade <= printed
    ? runeRefused(message('character.validation.runeNotHigher', { grade: printed }))
    : undefined;
}

/** The etching restrictions a weapon's content answers; any other isn't checked. */
const MELEE = EtchingRestriction.parse('melee');
const RANGED = EtchingRestriction.parse('ranged');

/** Whether an item meets a property rune's restriction: only a weapon's melee or ranged is known. */
function meetsRestriction(entry: ItemEntry | undefined, restriction: EtchingRestriction | undefined): boolean {
  if (entry?.kind !== ContentKind.Weapon) {
    return true;
  }
  const ranged = entry.data.range !== undefined && !entry.traits.some((trait) => trait.startsWith('thrown'));
  return (restriction !== MELEE || !ranged) && (restriction !== RANGED || ranged);
}

/** Refuses a property rune no loaded pack has, and one for another kind of item or whose restriction it doesn't meet. */
function propertyFitRefusal(
  runes: RuneContent,
  { entry, runed }: RunedLine,
  id: ContentId,
): InventoryRefusal | undefined {
  const rune = runes.get(id);
  if (rune?.data.type !== RuneType.Property) {
    return runeRefused(message('character.validation.unknownRune'));
  }
  const { etchedOnto } = rune.data;
  return etchedOnto.item === runed && meetsRestriction(entry, etchedOnto.restriction)
    ? undefined
    : runeRefused(message('character.validation.runeNotForItem'));
}

/**
 * Refuses a property rune that doesn't fit the item (`propertyFitRefusal`), any on a specific item, one already
 * etched, and one past the room its potency rune leaves.
 */
function propertyRefusal(runes: RuneContent, line: RunedLine, id: ContentId): InventoryRefusal | undefined {
  const unfit = propertyFitRefusal(runes, line, id);
  if (unfit !== undefined) {
    return unfit;
  }
  if (isSpecific(line.entry)) {
    return runeRefused(message('character.validation.specificRunes'));
  }
  const current = itemRunes(line.item, line.entry);
  if (current.property.includes(id)) {
    return runeRefused(message('character.validation.runeEtched'));
  }
  const room = propertyRoom(current);
  return current.property.length >= room
    ? runeRefused(message('character.validation.propertyRunesFull', { maximum: room }))
    : undefined;
}

/** Refuses etching onto anything but a weapon, armour or a shield, and the fundamental and property refusals. */
function etchRefusal(runes: RuneContent, line: RunedLine, rune: RuneEtching): InventoryRefusal | undefined {
  if (line.runed === undefined) {
    return runeRefused(message('character.validation.takesNoRunes'));
  }
  return rune.type === RuneType.Fundamental ? fundamentalRefusal(line, rune) : propertyRefusal(runes, line, rune.rune);
}

/** Refuses erasing or moving a specific item's property runes, and a rune that isn't etched onto the item. */
function etchedRefusal({ item, entry }: RunedLine, rune: RuneRef): InventoryRefusal | undefined {
  if (rune.type === RuneType.Property && isSpecific(entry)) {
    return runeRefused(message('character.validation.specificRunes'));
  }
  return etchingOf(item.runes ?? NO_RUNES, rune) === undefined
    ? runeRefused(message('character.validation.runeNotEtched'))
    : undefined;
}

/** The two items of a transfer, as the refusal reads them. */
interface TransferLines {
  readonly from: RunedLine;
  readonly to: RunedLine;
}

/**
 * Refuses moving a rune onto the item it is on, off a specific item or onto one, onto an item that already has that
 * fundamental rune, and whatever refuses erasing it here (`etchedRefusal`) or etching it there (`etchRefusal`).
 */
function transferRefusal(runes: RuneContent, { from, to }: TransferLines, rune: RuneRef): InventoryRefusal | undefined {
  if (to.item.id === from.item.id) {
    return { field: InventoryRefusalField.To, message: message('character.validation.transferSameItem') };
  }
  if (isSpecific(from.entry) || isSpecific(to.entry)) {
    return runeRefused(message('character.validation.specificRunes'));
  }
  const moving = etchingOf(from.item.runes ?? NO_RUNES, rune);
  if (moving === undefined) {
    return etchedRefusal(from, rune);
  }
  if (moving.type === RuneType.Fundamental && to.item.runes?.[moving.rune] !== undefined) {
    return runeRefused(message('character.validation.runeEtched'));
  }
  return etchRefusal(runes, to, moving);
}

function itemNotFound(field: InventoryRefusal['field']): InventoryRefusal {
  return { field, message: message('character.validation.itemNotFound') };
}

/**
 * Refuses a rune edit the rules don't allow: etching (`etchRefusal`), erasing a rune that isn't etched or a specific
 * item's (`etchedRefusal`), and transferring (`transferRefusal`). Run after `inventoryRefusal`, which checks the items
 * are in the inventory.
 */
export function runeRefusal(content: RunedContent, inventory: Inventory, edit: RuneEdit): InventoryRefusal | undefined {
  const line = runedLine(content, inventory, edit.id);
  if (line === undefined) {
    return itemNotFound(InventoryRefusalField.Id);
  }
  switch (edit.action) {
    case RuneAction.Etch: {
      return etchRefusal(content.runes, line, edit.rune);
    }
    case RuneAction.Erase: {
      return etchedRefusal(line, edit.rune);
    }
    case RuneAction.Transfer: {
      const to = runedLine(content, inventory, edit.to);
      return to === undefined
        ? itemNotFound(InventoryRefusalField.To)
        : transferRefusal(content.runes, { from: line, to }, edit.rune);
    }
    default: {
      return edit satisfies never;
    }
  }
}
