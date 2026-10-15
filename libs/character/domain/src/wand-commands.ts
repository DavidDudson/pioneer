import { degreeOfSuccess, DieFace, RollTotal } from '@pioneer/rules/dice';
import { Dc, DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CountDelta, spentAfter, wandOverchargeKey, wandUseKey } from './counted-resources';
import type { CountedMaxima, SpentCounts } from './counted-resources';
import { InventoryItemId, removeItem } from './inventory';
import type { Inventory } from './inventory';
import { breakItem } from './inventory-broken';
import type { WandSource } from './wand-sources';

/** The DC of the flat check that overcharges a wand (GM Core, Magic Wands). */
export const OVERCHARGE_DC = Dc.parse(10);

const SPEND = CountDelta.parse(1);

/** The play edits that cast a wand. */
export const WandCommandField = {
  /** The wand's day cast, at the wand's rank. */
  CastWand: 'castWand',
  /** One more cast after the day's, with a flat check: `roll` is the d20, absent once the wand was overcharged today. */
  OverchargeWand: 'overchargeWand',
} as const;
export type WandCommandField = ValueOf<typeof WandCommandField>;

export const WandCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(WandCommandField.CastWand),
    item: InventoryItemId,
  }),
  z.object({
    field: z.literal(WandCommandField.OverchargeWand),
    item: InventoryItemId,
    roll: DieFace.optional(),
  }),
]);
export type WandCommand = z.infer<typeof WandCommandSchema>;

/** What a wand cast comes to. */
export const WandOutcome = {
  /** The day's cast: the spell is cast and the wand is as it was. */
  Cast: 'cast',
  /** The flat check passed: the spell is cast and the wand is broken. */
  Broken: 'broken',
  /** The flat check failed, or the wand was overcharged already today: nothing is cast and the wand is gone. */
  Destroyed: 'destroyed',
} as const;
export type WandOutcome = ValueOf<typeof WandOutcome>;

/** Why a wand cast is refused. */
export const WandProblem = {
  /** The item is no wand the character holds. */
  NotHeld: 'not-held',
  /** A broken wand can't be cast or overcharged until it is repaired. */
  Broken: 'broken',
  /** None of the holder's spell lists has the spell, or none casts its rank. */
  NotCastable: 'not-castable',
  /** The day's cast is spent; only an overcharge is left. */
  UseSpent: 'use-spent',
  /** The day's cast is not spent yet; a wand is overcharged only after it. */
  UseLeft: 'use-left',
  /** An overcharge needs the flat check rolled, unless the wand was overcharged already today. */
  RollMissing: 'roll-missing',
} as const;
export type WandProblem = ValueOf<typeof WandProblem>;

/** Whether the flat check of `roll` against the overcharge DC passes. */
export function overchargePasses(roll: DieFace): boolean {
  const { degree } = degreeOfSuccess({ total: RollTotal.parse(roll), natural: roll }, OVERCHARGE_DC);
  return degree === DegreeOfSuccess.Success || degree === DegreeOfSuccess.CriticalSuccess;
}

/** Why `command` can't be made with `source`, or undefined when it can. */
export function wandProblem(command: WandCommand, source: WandSource | undefined): WandProblem | undefined {
  if (source === undefined) {
    return WandProblem.NotHeld;
  }
  if (source.broken) {
    return WandProblem.Broken;
  }
  if (source.entry === undefined) {
    return WandProblem.NotCastable;
  }
  const spent = source.use.left === 0;
  if (command.field === WandCommandField.CastWand) {
    return spent ? WandProblem.UseSpent : undefined;
  }
  if (!spent) {
    return WandProblem.UseLeft;
  }
  return source.overcharge.left > 0 && command.roll === undefined ? WandProblem.RollMissing : undefined;
}

/** What `command` comes to for `source`; the command must pass `wandProblem`. */
export function wandOutcome(command: WandCommand, source: WandSource): WandOutcome {
  if (command.field === WandCommandField.CastWand) {
    return WandOutcome.Cast;
  }
  const { roll } = command;
  if (source.overcharge.left === 0 || roll === undefined) {
    return WandOutcome.Destroyed;
  }
  return overchargePasses(roll) ? WandOutcome.Broken : WandOutcome.Destroyed;
}

/** The spent uses after `command`: the day's cast, or the overcharge, is spent. */
export function wandUsesAfter(
  uses: SpentCounts['uses'],
  counted: CountedMaxima,
  command: WandCommand,
): SpentCounts['uses'] {
  const key = command.field === WandCommandField.CastWand ? wandUseKey(command.item) : wandOverchargeKey(command.item);
  return spentAfter({ spent: uses, maxima: counted.uses, key }, SPEND);
}

/** The inventory after a wand cast came to `outcome`: a broken wand is marked, a destroyed one leaves. */
export function wandInventoryAfter(inventory: Inventory, item: InventoryItemId, outcome: WandOutcome): Inventory {
  switch (outcome) {
    case WandOutcome.Cast: {
      return inventory;
    }
    case WandOutcome.Broken: {
      return breakItem(inventory, item, true);
    }
    case WandOutcome.Destroyed: {
      return removeItem(inventory, item);
    }
    default: {
      return outcome satisfies never;
    }
  }
}

/** Whether `command` casts or overcharges a wand, the play edits that can also change the inventory. */
export function isWandCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, WandCommand> {
  return Object.values<unknown>(WandCommandField).includes(command.field);
}
