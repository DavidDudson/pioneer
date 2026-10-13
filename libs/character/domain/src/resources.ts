import type { FocusPoints } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The most hero points a character holds (Player Core). */
export const HERO_POINTS_MAX = 3;

/** A count of points of one resource: held, spent, or its maximum. */
export const ResourceCount = Pg.smallint().min(0).brand<'ResourceCount'>();
export type ResourceCount = z.infer<typeof ResourceCount>;

/** Points held plus or less what an edit moves them by, before they are held within the pool. */
const PointsSum = Pg.integer().brand<'PointsSum'>();
type PointsSum = z.infer<typeof PointsSum>;

const NONE = ResourceCount.parse(0);

/** The pools of points a character spends and regains at the table. */
export const Resource = {
  HeroPoints: 'hero-points',
  FocusPoints: 'focus-points',
} as const;
export type Resource = ValueOf<typeof Resource>;
export const ResourceSchema = z.enum(Resource);

/**
 * The points spent from each pool, as inputs. What is held is the maximum the engine derives less what is spent
 * (`currentResource`), so a pool that grows or shrinks with the build keeps what was spent, and a character with no play
 * state yet holds everything.
 */
export const ResourcesSpentSchema = z.strictObject({
  [Resource.HeroPoints]: ResourceCount.default(NONE),
  [Resource.FocusPoints]: ResourceCount.default(NONE),
});
export type ResourcesSpent = z.infer<typeof ResourcesSpentSchema>;

/** The most each pool holds, as the engine and the rules derive them. */
export type ResourceMaxima = Readonly<Record<Resource, ResourceCount>>;

/** Every pool empty, for a character that has none. */
export const NO_RESOURCES: ResourceMaxima = {
  [Resource.HeroPoints]: NONE,
  [Resource.FocusPoints]: NONE,
};

/** The maxima of a character whose focus spells give a pool of `focus`; hero points are always at most 3. */
export function resourceMaxima(focus: FocusPoints): ResourceMaxima {
  return {
    [Resource.HeroPoints]: ResourceCount.parse(HERO_POINTS_MAX),
    [Resource.FocusPoints]: ResourceCount.parse(focus),
  };
}

/** The pools as the table has them: what is spent from each, against what each holds at most. */
export interface Pools {
  readonly spent: ResourcesSpent;
  readonly maxima: ResourceMaxima;
}

/** `max` less what is spent, never below 0: the points held. */
export function currentResource(spent: ResourcesSpent, resource: Resource, max: ResourceMaxima): ResourceCount {
  return ResourceCount.parse(Math.max(max[resource] - spent[resource], 0));
}

/** What `pools` hold of `resource`. */
export function heldIn(pools: Pools, resource: Resource): ResourceCount {
  return currentResource(pools.spent, resource, pools.maxima);
}

/** The spent points with `resource` holding `wanted` points, held within 0 and the pool's maximum. */
function holding(pools: Pools, resource: Resource, wanted: PointsSum): ResourcesSpent {
  const held = Math.min(Math.max(wanted, 0), pools.maxima[resource]);
  return { ...pools.spent, [resource]: ResourceCount.parse(pools.maxima[resource] - held) };
}

/** The spent points after `amount` more are spent from `resource`, never below 0 held. */
export function spendPoints(pools: Pools, resource: Resource, amount: ResourceCount): ResourcesSpent {
  return holding(pools, resource, PointsSum.parse(heldIn(pools, resource) - amount));
}

/** The spent points after `amount` are regained by `resource`, never past its maximum. */
export function regainPoints(pools: Pools, resource: Resource, amount: ResourceCount): ResourcesSpent {
  return holding(pools, resource, PointsSum.parse(heldIn(pools, resource) + amount));
}

/** The spent points after `resource` is set to hold `current`, held within 0 and its maximum. */
export function setPoints(pools: Pools, resource: Resource, current: ResourceCount): ResourcesSpent {
  return holding(pools, resource, PointsSum.parse(current));
}
