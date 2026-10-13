import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { stabilised } from './death-track';
import type { DeathTrack } from './death-track';
import { heldIn, regainPoints, Resource, ResourceCount, ResourceSchema, setPoints, spendPoints } from './resources';
import type { Pools, ResourceMaxima, ResourcesSpent } from './resources';

const NO_POINTS = ResourceCount.parse(0);

/** The play edits that move a pool of points. */
export const ResourceCommandField = {
  /** Points spent from a pool; spending every hero point while dying stabilises (Heroic Recovery). */
  SpendResource: 'spendResource',
  RegainResource: 'regainResource',
  /** Points held set outright, as when correcting a mistake or at the start of a session. */
  SetResource: 'setResource',
} as const;
export type ResourceCommandField = ValueOf<typeof ResourceCommandField>;

export const ResourceCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ResourceCommandField.SpendResource), resource: ResourceSchema, amount: ResourceCount }),
  z.object({ field: z.literal(ResourceCommandField.RegainResource), resource: ResourceSchema, amount: ResourceCount }),
  z.object({ field: z.literal(ResourceCommandField.SetResource), resource: ResourceSchema, current: ResourceCount }),
]);
export type ResourceCommand = z.infer<typeof ResourceCommandSchema>;

/** The part of a play state a pool edit reads and writes: the points spent, and the death track Heroic Recovery ends. */
export type ResourcePlay = DeathTrack & { readonly resources: ResourcesSpent };

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

/**
 * `play` after `command`, with the points held in a pool kept within 0 and its maximum. Spending every hero point of
 * a dying character is Heroic Recovery; setting them to 0 is a correction and is not.
 */
export function applyResourceCommand(
  play: ResourcePlay,
  command: ResourceCommand,
  maxima: ResourceMaxima,
): ResourcePlay {
  const pools: Pools = { spent: play.resources, maxima };
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
    default: {
      return command satisfies never;
    }
  }
}
