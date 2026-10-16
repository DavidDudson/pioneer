import { DamageApplication, DamageTotal } from '@pioneer/rules/dice';
import { HitPoints } from '@pioneer/rules/sdk';
import type { Hardness } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { HeldShield } from './equipped';
import { afterDamage } from './hit-point-edits';
import { InventoryItemId } from './inventory';
import type { PlayLimits, PlayState } from './play-state';

const NONE = HitPoints.parse(0);

/** The most shields whose damage a character remembers; a shield past it is not tracked, so a request cannot grow the play state. */
export const SHIELDS_MAX = 32;

/** The damage each shield has taken, by the inventory item that holds it. A shield left out has taken none. */
export const ShieldDamageSchema = z.record(InventoryItemId, HitPoints).default({});
export type ShieldDamage = z.infer<typeof ShieldDamageSchema>;

/** A shield's Hardness and Hit Points, from its content. */
export interface ShieldStats {
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
  /** Half its Hit Points, rounded down: at or below it the shield is broken. */
  readonly brokenThreshold: HitPoints;
}

/** The shields the character holds, by the inventory item, as the server's content gives them. */
export type ShieldContent = ReadonlyMap<InventoryItemId, ShieldStats>;

/** No shields held, for edits that don't read them. */
export const NO_SHIELDS: ShieldContent = new Map();

/** The shields `held` as content, by the inventory item that holds each. */
export function shieldContent(held: readonly HeldShield[]): ShieldContent {
  return new Map(
    held.map(({ item, hardness, hitPoints, brokenThreshold }): [InventoryItemId, ShieldStats] => [
      item,
      { hardness, hitPoints, brokenThreshold },
    ]),
  );
}

/** The play edits that use a shield. */
export const ShieldCommandField = {
  /** Shield Block: the shield prevents damage up to its Hardness; the character and the shield each take the rest. */
  BlockWithShield: 'blockWithShield',
} as const;
export type ShieldCommandField = ValueOf<typeof ShieldCommandField>;

export const ShieldCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ShieldCommandField.BlockWithShield), item: InventoryItemId, damage: DamageApplication }),
]);
export type ShieldCommand = z.infer<typeof ShieldCommandSchema>;

/** How a shield stands: whole, broken (its bonus lost) or destroyed (gone). */
export const ShieldCondition = { Whole: 'whole', Broken: 'broken', Destroyed: 'destroyed' } as const;
export type ShieldCondition = ValueOf<typeof ShieldCondition>;

/** Why a block is refused. */
export const ShieldProblem = {
  /** The character holds no such shield. */
  NotHeld: 'not-held',
  /** A broken shield can't be used for Shield Block. */
  Broken: 'broken',
} as const;
export type ShieldProblem = ValueOf<typeof ShieldProblem>;

/** The Hit Points the shield has left after `damage`. */
export function shieldHitPoints({ hitPoints }: ShieldStats, damage: HitPoints): HitPoints {
  return HitPoints.parse(Math.max(hitPoints - damage, 0));
}

/** How a shield that has taken `damage` stands: destroyed at 0 Hit Points, broken at or below its Broken Threshold. */
export function shieldCondition(stats: ShieldStats, damage: HitPoints): ShieldCondition {
  const left = shieldHitPoints(stats, damage);
  if (left === NONE) {
    return ShieldCondition.Destroyed;
  }
  return left <= stats.brokenThreshold ? ShieldCondition.Broken : ShieldCondition.Whole;
}

/** What a block did to the damage: the Hardness took some, and the rest falls on the shield and the character each. */
export interface Block {
  readonly prevented: DamageTotal;
  readonly remaining: DamageTotal;
}

/** `taken` damage blocked by a shield of `hardness`: it prevents up to its Hardness, and the rest goes through. */
export function blocked(taken: DamageTotal, hardness: Hardness): Block {
  const prevented = DamageTotal.parse(Math.min(taken, hardness));
  return { prevented, remaining: DamageTotal.parse(taken - prevented) };
}

/** Why `item` can't block with `damage` already on it, or undefined when it can. */
export function blockProblem(
  shields: ShieldContent,
  played: ShieldDamage,
  item: InventoryItemId,
): ShieldProblem | undefined {
  const stats = shields.get(item);
  if (stats === undefined) {
    return ShieldProblem.NotHeld;
  }
  return shieldCondition(stats, played[item] ?? NONE) === ShieldCondition.Whole ? undefined : ShieldProblem.Broken;
}

/** How a shield that has already taken `damage` stands once it blocks `taken` damage: the Hardness prevents some, and it takes the rest. */
export function conditionAfterBlock(stats: ShieldStats, damage: HitPoints, taken: DamageTotal): ShieldCondition {
  const through = HitPoints.parse(Math.min(damage + blocked(taken, stats.hardness).remaining, stats.hitPoints));
  return shieldCondition(stats, through);
}

/** What hits a shield: its stats, and the damage it takes. */
export interface Blow {
  readonly stats: ShieldStats;
  readonly amount: DamageTotal;
}

/** `shields` after `item` takes `amount` more, never past its Hit Points; a shield not yet tracked is added unless the character tracks the most. */
export function shieldDamaged(shields: ShieldDamage, item: InventoryItemId, blow: Blow): ShieldDamage {
  const { stats, amount } = blow;
  if (!(item in shields) && Object.keys(shields).length >= SHIELDS_MAX) {
    return shields;
  }
  const damage = HitPoints.parse(Math.min((shields[item] ?? NONE) + amount, stats.hitPoints));
  return { ...shields, [item]: damage };
}

/** `shields` without the damage on the shield `item`, as when it is destroyed or repaired. */
export function shieldCleared(shields: ShieldDamage, item: InventoryItemId): ShieldDamage {
  return Object.fromEntries(Object.entries(shields).filter(([key]) => key !== item));
}

/** Whether `command` is one of the shield edits. */
export function isShieldCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ShieldCommand> {
  return Object.values<unknown>(ShieldCommandField).includes(command.field);
}

/**
 * `play` after a Shield Block: the shield prevents damage up to its Hardness, and the character and the shield each take
 * the rest. A shield the character does not hold, or one that is broken, blocks nothing. A shield taken to 0 Hit Points is
 * destroyed, so its damage is no longer kept.
 */
export function afterBlock(play: PlayState, command: ShieldCommand, limits: PlayLimits): PlayState {
  const { item, damage } = command;
  const stats = limits.shields.get(item);
  if (stats === undefined || blockProblem(limits.shields, play.shields, item) !== undefined) {
    return play;
  }
  const { remaining } = blocked(damage.taken, stats.hardness);
  const hurt = afterDamage(play, { ...damage, taken: remaining }, limits.hitPoints);
  const shields = shieldDamaged(play.shields, item, { stats, amount: remaining });
  const destroyed = conditionAfterBlock(stats, play.shields[item] ?? NONE, damage.taken) === ShieldCondition.Destroyed;
  return { ...hurt, shields: destroyed ? shieldCleared(shields, item) : shields };
}
