import { DamageApplication, DamageTotal } from '@pioneer/rules/dice';
import { Hardness, HitPoints } from '@pioneer/rules/sdk';
import type { HardnessBonus } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { endEffects } from './effect-ending';
import { EffectBadgeValue } from './effects';
import type { HeldShield, ShieldGrant } from './held-shields';
import { afterDamage } from './hit-point-edits';
import { InventoryItemId } from './inventory';
import type { PlayLimits, PlayState } from './play-state';

const NONE = HitPoints.parse(0);

/** How many layers a layered shield starts with. */
export const SHIELD_LAYERS_MAX = 3;

/** A count of layers a block breaks, or a shield has left. */
export const ShieldLayers = z.number().int().min(1).max(SHIELD_LAYERS_MAX).brand<'ShieldLayers'>();
export type ShieldLayers = z.infer<typeof ShieldLayers>;

const PERCENT = 100;
const HALF_AGAIN = 150;
const DOUBLE = 200;
/** The share of its Hardness a layered shield has when a block breaks one, two or all three layers. */
const LAYERS_HARDNESS_PERCENT: Readonly<Record<ShieldLayers, number>> = {
  [ShieldLayers.parse(1)]: PERCENT,
  [ShieldLayers.parse(2)]: HALF_AGAIN,
  [ShieldLayers.parse(SHIELD_LAYERS_MAX)]: DOUBLE,
};

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
  /** A battle form's shield: it takes no damage, so it never breaks and none is kept on it. */
  readonly undamageable?: true;
  /** A shield an effect gives: the effect, and what ends it. */
  readonly granted?: ShieldGrant;
  /** Extra Hardness against damage of some types. */
  readonly hardnessAgainst?: readonly HardnessBonus[];
}

/** The shields the character holds, by the inventory item, as the server's content gives them. */
export type ShieldContent = ReadonlyMap<InventoryItemId, ShieldStats>;

/** No shields held, for edits that don't read them. */
export const NO_SHIELDS: ShieldContent = new Map();

/** The shields `held` as content, by the inventory item that holds each. */
export function shieldContent(held: readonly HeldShield[]): ShieldContent {
  return new Map(
    held.map(
      ({
        item,
        hardness,
        hitPoints,
        brokenThreshold,
        undamageable,
        granted,
        hardnessAgainst,
      }): [InventoryItemId, ShieldStats] => [
        item,
        {
          hardness,
          hitPoints,
          brokenThreshold,
          ...(undamageable === true ? { undamageable } : {}),
          ...(granted === undefined ? {} : { granted }),
          ...(hardnessAgainst === undefined ? {} : { hardnessAgainst }),
        },
      ],
    ),
  );
}

/** The play edits that use a shield. */
export const ShieldCommandField = {
  /** Shield Block: the shield prevents damage up to its Hardness; the character and the shield each take the rest. */
  BlockWithShield: 'blockWithShield',
} as const;
export type ShieldCommandField = ValueOf<typeof ShieldCommandField>;

export const ShieldCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(ShieldCommandField.BlockWithShield),
    item: InventoryItemId,
    damage: DamageApplication,
    /** The layers a layered shield breaks with the block; one when left out. */
    layers: ShieldLayers.optional(),
  }),
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
  if (stats.undamageable === true) {
    return ShieldCondition.Whole;
  }
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

/**
 * The Hardness the shield has against `blow`: its own, and each bonus whose damage types the blow is all of. A blow of
 * no damage, or with untyped damage in it, gets no bonus. A layered shield has more for each layer the block breaks.
 */
export function hardnessFor(
  { hardness, hardnessAgainst: bonuses = [] }: ShieldStats,
  blow: DamageApplication,
  layers?: ShieldLayers,
): Hardness {
  const types = blow.immediate.map(({ type }) => type);
  const extra = bonuses
    .filter((each) => types.length > 0 && types.every((type) => type !== undefined && each.types.includes(type)))
    .reduce((sum, { bonus }) => sum + bonus, 0);
  const percent = (layers === undefined ? undefined : LAYERS_HARDNESS_PERCENT[layers]) ?? PERCENT;
  return Hardness.parse(Math.floor(((hardness + extra) * percent) / PERCENT));
}

/** The layers a layered shield has left: its effect's badge, or all of them before one has been broken. */
export function layersLeft(play: PlayState, { effect }: ShieldGrant): EffectBadgeValue {
  return play.effects.find((each) => each.effect === effect)?.badge ?? EffectBadgeValue.parse(SHIELD_LAYERS_MAX);
}

/** The layers `command` breaks of a layered shield: those asked for, never more than it has left. */
function layersBroken(
  play: PlayState,
  command: ShieldCommand,
  granted: ShieldGrant | undefined,
): ShieldLayers | undefined {
  if (granted?.layered !== true) {
    return undefined;
  }
  return ShieldLayers.parse(Math.min(command.layers ?? 1, layersLeft(play, granted)));
}

/** The layered shield a block broke layers of, and how many. */
interface Breaking {
  readonly item: InventoryItemId;
  readonly granted: ShieldGrant;
  readonly layers: ShieldLayers;
}

/** `play` with the layers gone that `breaking` names: the effect ends with the last, and counts the rest. */
function withoutLayers(play: PlayState, { item, granted, layers }: Breaking): PlayState {
  const left = layersLeft(play, granted) - layers;
  if (left <= 0) {
    return withoutShield(play, item, granted);
  }
  const effects = play.effects.map((each) =>
    each.effect === granted.effect ? { ...each, badge: EffectBadgeValue.parse(left) } : each,
  );
  return { ...play, effects };
}

/** How a shield that has already taken `damage` stands once it blocks `blow`: the Hardness prevents some, and it takes the rest. */
export function conditionAfterBlock(stats: ShieldStats, damage: HitPoints, blow: DamageApplication): ShieldCondition {
  const { remaining } = blocked(blow.taken, hardnessFor(stats, blow));
  const through = HitPoints.parse(Math.min(damage + remaining, stats.hitPoints));
  return shieldCondition(stats, through);
}

/** What hits a shield: its stats, and the damage it takes. */
interface Blow {
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
 * destroyed, so its damage is no longer kept. A shield an effect gives ends that effect when it ends on a block, or
 * when it is destroyed and ends then.
 */
export function afterBlock(play: PlayState, command: ShieldCommand, limits: PlayLimits): PlayState {
  const { item, damage } = command;
  const stats = limits.shields.get(item);
  if (stats === undefined || blockProblem(limits.shields, play.shields, item) !== undefined) {
    return play;
  }
  const layers = layersBroken(play, command, stats.granted);
  const { remaining } = blocked(damage.taken, hardnessFor(stats, damage, layers));
  const hurt = afterDamage(play, { ...damage, taken: remaining }, limits.hitPoints);
  const destroyed =
    stats.undamageable !== true &&
    conditionAfterBlock(stats, play.shields[item] ?? NONE, damage) === ShieldCondition.Destroyed;
  const shields =
    stats.undamageable === true ? hurt.shields : shieldDamaged(hurt.shields, item, { stats, amount: remaining });
  const kept = { ...hurt, shields: destroyed ? shieldCleared(shields, item) : shields };
  return afterEffect(kept, { item, stats, destroyed, layers });
}

/** What a block did to the shield and the effect that gives it. */
interface Outcome {
  readonly item: InventoryItemId;
  readonly stats: ShieldStats;
  readonly destroyed: boolean;
  readonly layers: ShieldLayers | undefined;
}

/** `play` once the effect that gives the shield has lost the layers or ended, as the block decides. */
function afterEffect(play: PlayState, { item, stats, destroyed, layers }: Outcome): PlayState {
  const { granted } = stats;
  if (granted !== undefined && layers !== undefined) {
    return withoutLayers(play, { item, granted, layers });
  }
  return effectEnded(granted, destroyed) ? withoutShield(play, item, granted) : play;
}

/** Whether a block ended the effect that gives the shield: always when it ends on a block, and when destroyed if it ends then. */
function effectEnded(granted: ShieldGrant | undefined, destroyed: boolean): granted is ShieldGrant {
  return granted !== undefined && (granted.endsOnBlock || (destroyed && granted.endsWhenDestroyed));
}

/** `play` without the effect that gave the shield `item`, and without the damage kept for the shield. */
function withoutShield(play: PlayState, item: InventoryItemId, { effect }: ShieldGrant): PlayState {
  const ended = play.effects.filter((each) => each.effect === effect).map(({ id }) => id);
  return endEffects({ ...play, shields: shieldCleared(play.shields, item) }, ended);
}
