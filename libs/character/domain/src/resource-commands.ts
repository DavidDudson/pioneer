import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CountDelta, spentAfter, SlotCountKey, UseCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { stabilised } from './death-track';
import type { DeathTrack } from './death-track';
import { heldIn, regainPoints, Resource, ResourceCount, ResourceSchema, setPoints, spendPoints } from './resources';
import type { Pools, ResourceMaxima, ResourcesSpent } from './resources';
import { isStaffCommand, StaffCommandField, StaffCommandSchema, staffResourcesAfter } from './staff-commands';
import type { StaffCommand } from './staff-commands';
import { WandCommandField, WandCommandSchema, wandUsesAfter } from './wand-commands';
import type { WandCommand } from './wand-commands';

const NO_POINTS = ResourceCount.parse(0);

/** The play edits that move a pool of points. */
export const ResourceCommandField = {
  /** Points spent from a pool; spending every hero point while dying stabilises (Heroic Recovery). */
  SpendResource: 'spendResource',
  RegainResource: 'regainResource',
  /** Points held set outright, as when correcting a mistake or at the start of a session. */
  SetResource: 'setResource',
  /** One spell slot of an entry and rank spent or refunded; a slot costs one. */
  SpendSlot: 'spendSlot',
  RefundSlot: 'refundSlot',
  /** One use of a feat or action with a frequency spent or refunded. */
  SpendUse: 'spendUse',
  RefundUse: 'refundUse',
  /** A held wand cast, or overcharged after the day's cast (`wand-commands.ts`). */
  ...WandCommandField,
  /** A spell cast from a held staff, or such a cast taken back (`staff-commands.ts`). */
  ...StaffCommandField,
} as const;
export type ResourceCommandField = ValueOf<typeof ResourceCommandField>;

export const ResourceCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ResourceCommandField.SpendResource), resource: ResourceSchema, amount: ResourceCount }),
  z.object({ field: z.literal(ResourceCommandField.RegainResource), resource: ResourceSchema, amount: ResourceCount }),
  z.object({ field: z.literal(ResourceCommandField.SetResource), resource: ResourceSchema, current: ResourceCount }),
  z.object({ field: z.literal(ResourceCommandField.SpendSlot), slot: SlotCountKey }),
  z.object({ field: z.literal(ResourceCommandField.RefundSlot), slot: SlotCountKey }),
  z.object({ field: z.literal(ResourceCommandField.SpendUse), use: UseCountKey }),
  z.object({ field: z.literal(ResourceCommandField.RefundUse), use: UseCountKey }),
  ...WandCommandSchema.options,
  ...StaffCommandSchema.options,
]);
export type ResourceCommand = z.infer<typeof ResourceCommandSchema>;

/** The part of a play state a pool edit reads and writes: the points spent, and the death track Heroic Recovery ends. */
export type ResourcePlay = DeathTrack & { readonly resources: ResourcesSpent };

const SPEND = CountDelta.parse(1);
const REFUND = CountDelta.parse(-1);

/** `play` with some of its spent slot or use counts replaced. */
function withCounts(play: ResourcePlay, counts: Partial<Pick<ResourcesSpent, 'slots' | 'uses'>>): ResourcePlay {
  return { ...play, resources: { ...play.resources, ...counts } };
}

/** Points spent from one pool. */
interface Spending {
  readonly resource: Resource;
  readonly amount: ResourceCount;
}

/** `play` after `spending`: the last hero point spent while dying is Heroic Recovery, which ends dying. */
function afterSpending(play: ResourcePlay, pools: Pools, { resource, amount }: Spending): ResourcePlay {
  const resources = spendPoints(pools, resource, amount);
  const emptied = heldIn(pools, resource) > NO_POINTS && heldIn({ ...pools, spent: resources }, resource) === NO_POINTS;
  const spent = { ...play, resources };
  return resource === Resource.HeroPoints && emptied ? { ...spent, ...stabilised(spent) } : spent;
}

/** `play` after a wand cast, or a staff cast or its undoing: the uses spent, or the charges and the slot. */
function applyItemCommand(
  play: ResourcePlay,
  command: WandCommand | StaffCommand,
  { counted, staffCost }: Pick<ResourceLimits, 'counted' | 'staffCost'>,
): ResourcePlay {
  return isStaffCommand(command)
    ? { ...play, resources: staffResourcesAfter({ resources: play.resources, counted, command, cost: staffCost }) }
    : withCounts(play, { uses: wandUsesAfter(play.resources.uses, counted, command) });
}

/** What bounds a pool edit: the points each pool holds at most, and the slots and uses the build and content give. */
export interface ResourceLimits {
  readonly points: ResourceMaxima;
  readonly counted: CountedMaxima;
  /** The charges the staff cast being made spends, worked out from the staff's content; 0 for any other edit. */
  readonly staffCost: ResourceCount;
}

/**
 * `play` after `command`, with the points held in a pool kept within 0 and its maximum. Spending every hero point of
 * a dying character is Heroic Recovery; setting them to 0 is a correction and is not.
 */
export function applyResourceCommand(
  play: ResourcePlay,
  command: ResourceCommand,
  { points, counted, staffCost }: ResourceLimits,
): ResourcePlay {
  const pools: Pools = { spent: play.resources, maxima: points };
  switch (command.field) {
    case ResourceCommandField.SpendResource: {
      return afterSpending(play, pools, command);
    }
    case ResourceCommandField.RegainResource: {
      return { ...play, resources: regainPoints(pools, command.resource, command.amount) };
    }
    case ResourceCommandField.SetResource: {
      return { ...play, resources: setPoints(pools, command.resource, command.current) };
    }
    case ResourceCommandField.SpendSlot: {
      return withCounts(play, {
        slots: spentAfter({ spent: play.resources.slots, maxima: counted.slots, key: command.slot }, SPEND),
      });
    }
    case ResourceCommandField.RefundSlot: {
      return withCounts(play, {
        slots: spentAfter({ spent: play.resources.slots, maxima: counted.slots, key: command.slot }, REFUND),
      });
    }
    case ResourceCommandField.SpendUse: {
      return withCounts(play, {
        uses: spentAfter({ spent: play.resources.uses, maxima: counted.uses, key: command.use }, SPEND),
      });
    }
    case ResourceCommandField.RefundUse: {
      return withCounts(play, {
        uses: spentAfter({ spent: play.resources.uses, maxima: counted.uses, key: command.use }, REFUND),
      });
    }
    case ResourceCommandField.CastWand:
    case ResourceCommandField.OverchargeWand:
    case ResourceCommandField.CastStaff:
    case ResourceCommandField.UncastStaff: {
      return applyItemCommand(play, command, { counted, staffCost });
    }
    default: {
      return command satisfies never;
    }
  }
}
