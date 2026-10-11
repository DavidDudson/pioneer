import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { Inventory, InventoryItem, InventoryItemId } from './inventory';
import { hasRunes } from './item-runes';
import { NO_RUNES } from './rune-etching';
import type { ItemRunes, RuneEtching, RuneRef } from './rune-etching';

function withRunes(item: InventoryItem, runes: ItemRunes): InventoryItem {
  const { runes: _old, ...rest } = item;
  return hasRunes(runes) ? { ...rest, runes } : rest;
}

function changeRunes(inventory: Inventory, id: InventoryItemId, change: (runes: ItemRunes) => ItemRunes): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((each) => (each.id === id ? withRunes(each, change(each.runes ?? NO_RUNES)) : each)),
  };
}

function plusRune(runes: ItemRunes, etching: RuneEtching): ItemRunes {
  if (etching.type === RuneType.Property) {
    return runes.property.includes(etching.rune) ? runes : { ...runes, property: [...runes.property, etching.rune] };
  }
  return { ...runes, [etching.rune]: etching.grade };
}

function lessRune(runes: ItemRunes, rune: RuneRef): ItemRunes {
  if (rune.type === RuneType.Property) {
    return { ...runes, property: runes.property.filter((each) => each !== rune.rune) };
  }
  const { [rune.rune]: _old, ...rest } = runes;
  return rest;
}

/** Rune `rune` as etched onto `runes`, a fundamental one at its grade; undefined when it isn't etched there. */
export function etchingOf(runes: ItemRunes, rune: RuneRef): RuneEtching | undefined {
  if (rune.type === RuneType.Property) {
    return runes.property.includes(rune.rune) ? rune : undefined;
  }
  if (rune.rune === FundamentalRune.Reinforcing) {
    const { reinforcing } = runes;
    return reinforcing === undefined ? undefined : { type: rune.type, rune: rune.rune, grade: reinforcing };
  }
  const grade = runes[rune.rune];
  return grade === undefined ? undefined : { type: rune.type, rune: rune.rune, grade };
}

/**
 * `id` with `etching` etched onto it: a fundamental rune at its grade, in place of one it had, or a property rune it
 * hasn't already.
 */
export function etchRune(inventory: Inventory, id: InventoryItemId, etching: RuneEtching): Inventory {
  return changeRunes(inventory, id, (runes) => plusRune(runes, etching));
}

/** `id` without the etched rune `rune`; a specific item is left with the runes it came with. */
export function eraseRune(inventory: Inventory, id: InventoryItemId, rune: RuneRef): Inventory {
  return changeRunes(inventory, id, (runes) => lessRune(runes, rune));
}

/** A rune moved from one item onto another. */
export interface RuneTransfer {
  readonly from: InventoryItemId;
  readonly to: InventoryItemId;
  readonly rune: RuneRef;
}

/** The rune moved off `from` onto `to`, at its grade when it is fundamental; unchanged when `from` hasn't it etched. */
export function transferRune(inventory: Inventory, { from, to, rune }: RuneTransfer): Inventory {
  const etching = etchingOf(inventory.items.find((each) => each.id === from)?.runes ?? NO_RUNES, rune);
  return etching === undefined ? inventory : etchRune(eraseRune(inventory, from, rune), to, etching);
}

/** What a rune edit does. */
export const RuneAction = { Etch: 'etch', Erase: 'erase', Transfer: 'transfer' } as const;
export type RuneAction = ValueOf<typeof RuneAction>;

/** A rune edit, as the refusal reads it: the item it changes, the rune, and for a transfer the item it moves onto. */
export type RuneEdit =
  | { readonly action: typeof RuneAction.Etch; readonly id: InventoryItemId; readonly rune: RuneEtching }
  | { readonly action: typeof RuneAction.Erase; readonly id: InventoryItemId; readonly rune: RuneRef }
  | {
      readonly action: typeof RuneAction.Transfer;
      readonly id: InventoryItemId;
      readonly rune: RuneRef;
      readonly to: InventoryItemId;
    };
