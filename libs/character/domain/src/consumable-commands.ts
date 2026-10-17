import { ContentId, ContentKind, HitPoints } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { applyCountingCommand } from './counting-commands';
import { EffectCommandField } from './effect-commands';
import { EffectBadgeValue, EffectInstanceId, SELF } from './effects';
import { afterHealing } from './hit-point-edits';
import { InventoryItemId, ItemQuantity, removeItem, setItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import type { ItemContent } from './inventory-content';
import type { PlayLimits, PlayState } from './play-state';
import { SpendCommandField, SpendRequestSchema } from './spend-log';

const ONE = ItemQuantity.parse(1);

/** The play edits that use a consumable. */
export const ConsumableCommandField = {
  /** Uses one of a stack: its activation spent from the turn, the stack down by one, and what it does applied. */
  UseConsumable: 'useConsumable',
} as const;
export type ConsumableCommandField = ValueOf<typeof ConsumableCommandField>;

/** The effect using a consumable puts on the character, with what a formula badge rolled. */
const ConsumableEffectSchema = z.strictObject({
  id: EffectInstanceId,
  effect: ContentId,
  rolled: EffectBadgeValue.optional(),
});

export const ConsumableCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(ConsumableCommandField.UseConsumable),
    item: InventoryItemId,
    /** The activation's cost, as a spend; its `action` is the consumable's content id. */
    spend: SpendRequestSchema,
    /** The Hit Points a healing roll restored; the sheet rolls it, as it rolls every die. */
    heal: HitPoints.optional(),
    effect: ConsumableEffectSchema.optional(),
  }),
]);
export type ConsumableCommand = z.infer<typeof ConsumableCommandSchema>;

/** A consumable the character holds, as the content gives it. */
export interface HeldConsumable {
  /** The content the inventory item is. */
  readonly entry: ContentId;
  readonly quantity: ItemQuantity;
  /** The effect using it puts on the character, when it has one. */
  readonly effect: ContentId | undefined;
}

/** Why a use is refused. */
export const ConsumableProblem = {
  /** The character holds no such item, or it is no consumable. */
  NotHeld: 'not-held',
  /** The spend names another action than the consumable. */
  WrongAction: 'wrong-action',
  /** The effect applied is not the one the consumable gives. */
  WrongEffect: 'wrong-effect',
} as const;
export type ConsumableProblem = ValueOf<typeof ConsumableProblem>;

/** The consumable `item` is in `inventory`, or undefined when it holds none by that id. */
export function heldConsumable(
  inventory: Inventory,
  content: ItemContent,
  item: InventoryItemId,
): HeldConsumable | undefined {
  const held = inventory.items.find(({ id }) => id === item);
  const entry = held === undefined ? undefined : content.get(held.item);
  if (held === undefined || entry?.kind !== ContentKind.Consumable) {
    return undefined;
  }
  return { entry: entry.id, quantity: held.quantity, effect: entry.data.effect };
}

/** Why `command` can't be made with `held`, or undefined when it can. */
export function consumableProblem(
  command: ConsumableCommand,
  held: HeldConsumable | undefined,
): ConsumableProblem | undefined {
  if (held === undefined) {
    return ConsumableProblem.NotHeld;
  }
  if (command.spend.action !== held.entry) {
    return ConsumableProblem.WrongAction;
  }
  return command.effect !== undefined && command.effect.effect !== held.effect
    ? ConsumableProblem.WrongEffect
    : undefined;
}

/** `inventory` with one of `item` used: the stack down by one, and the item gone once none is left. */
export function consumableInventoryAfter(inventory: Inventory, item: InventoryItemId): Inventory {
  const held = inventory.items.find(({ id }) => id === item);
  if (held === undefined) {
    return inventory;
  }
  return held.quantity > ONE
    ? setItemQuantity(inventory, item, ItemQuantity.parse(held.quantity - ONE))
    : removeItem(inventory, item);
}

/** Whether `command` uses a consumable, the play edit that also changes the inventory. */
export function isConsumableCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ConsumableCommand> {
  return Object.values<unknown>(ConsumableCommandField).includes(command.field);
}

/**
 * `play` after a consumable is used: its activation spent from the turn and logged, the effect it gives applied and the
 * Hit Points it heals restored. The server has checked the use, so a spend the turn would refuse is not reached.
 */
export function afterConsumable(play: PlayState, command: ConsumableCommand, limits: PlayLimits): PlayState {
  const { spend, effect, heal } = command;
  const spent = applyCountingCommand(play, { field: SpendCommandField.SpendAction, ...spend }, limits);
  const applied =
    effect === undefined
      ? spent
      : applyCountingCommand(spent, { field: EffectCommandField.ApplyEffect, ...effect, source: SELF }, limits);
  return heal === undefined ? applied : afterHealing(applied, heal, limits.hitPoints);
}
