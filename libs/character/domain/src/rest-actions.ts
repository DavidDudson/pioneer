import { ConditionEffect, ConditionValue, HitPoints } from '@pioneer/rules/sdk';

import type { ActiveCondition } from './conditions';
import { Boundary } from './counted-resources';
import type { CountedMaximum, SlotCountKey, UseCountKey } from './counted-resources';
import { Doomed, recovered, withDoomed } from './death-track';
import type { DeathTrack } from './death-track';
import { heldIn, Resource, ResourceCount, setPoints } from './resources';
import type { Pools } from './resources';
import { withStaffPrepared } from './rest-staff';
import { RestChangeKind, RestCommandField } from './rest-types';
import type { RecoveryConditions, RestChange, RestCommand, RestLimits, RestOutcome, RestPlay } from './rest-types';
import type { StaffChoice } from './staff-charges';

const NONE = ResourceCount.parse(0);
const NO_HIT_POINTS = HitPoints.parse(0);

/** The hero points a character starts a session with (Player Core). */
const ONE = ResourceCount.parse(1);
const SESSION_HERO_POINTS = ONE;

/** A key a count is kept under. */
type CountKey = SlotCountKey | UseCountKey;

function trackOf({ dying, wounded, doomed, dead }: DeathTrack): DeathTrack {
  return { dying, wounded, doomed, dead };
}

function unchanged<Play extends RestPlay>(play: Play): RestOutcome<Play> {
  return { play, changes: [] };
}

function poolsOf(play: RestPlay, limits: RestLimits): Pools {
  return { spent: play.resources, maxima: limits.resources };
}

/** `outcome` with `change` made to its play state, and recorded. */
function after<Play extends RestPlay>(
  { changes }: RestOutcome<Play>,
  next: Play,
  change: RestChange,
): RestOutcome<Play> {
  return { play: next, changes: [...changes, change] };
}

/** Rest heals up to `healing`, and Hit Points back above 0 end dying. */
function withHealing<Play extends RestPlay>(
  outcome: RestOutcome<Play>,
  { hitPoints, healing }: RestLimits,
): RestOutcome<Play> {
  const { play } = outcome;
  const damage = HitPoints.parse(Math.min(play.hp.damage, hitPoints));
  const gained = HitPoints.parse(Math.min(healing, damage));
  if (gained === NO_HIT_POINTS) {
    return outcome;
  }
  const healed: Play = {
    ...play,
    hp: { ...play.hp, damage: HitPoints.parse(damage - gained) },
  };
  const revived = hitPoints > NO_HIT_POINTS && damage === hitPoints;
  const next: Play = revived ? { ...healed, ...recovered(trackOf(healed)) } : healed;
  return after(outcome, next, { kind: RestChangeKind.HitPoints, gained });
}

/** A condition after Rest: what is kept of it, and the change made when there is one. */
interface EasedCondition {
  readonly kept: readonly ActiveCondition[];
  readonly change: RestChange | undefined;
}

/** One condition after Rest: gone if the content removes it, a point lower if it lowers it (gone at 0), else as it was. */
function easedCondition(condition: ActiveCondition, recovery: RecoveryConditions): EasedCondition {
  const effect = recovery.get(condition.condition);
  if (effect === undefined) {
    return { kept: [condition], change: undefined };
  }
  const value = condition.value ?? ConditionValue.parse(1);
  if (effect === ConditionEffect.Remove || value <= 1) {
    return {
      kept: [],
      change: {
        kind: RestChangeKind.ConditionRemoved,
        condition: condition.condition,
      },
    };
  }
  const lowered = ConditionValue.parse(value - 1);
  return {
    kept: [{ ...condition, value: lowered }],
    change: {
      kind: RestChangeKind.ConditionLowered,
      condition: condition.condition,
      value: lowered,
    },
  };
}

/** Rest removes or lowers by 1 each condition the content eases on Rest. */
function withConditionsEased<Play extends RestPlay>(
  outcome: RestOutcome<Play>,
  { recovery }: RestLimits,
): RestOutcome<Play> {
  const eased = outcome.play.conditions.map((condition) => easedCondition(condition, recovery));
  const changes = eased.flatMap(({ change }) => (change === undefined ? [] : [change]));
  if (changes.length === 0) {
    return outcome;
  }
  const next: Play = {
    ...outcome.play,
    conditions: eased.flatMap(({ kept }) => kept),
  };
  return { play: next, changes: [...outcome.changes, ...changes] };
}

/** Rest lowers doomed by 1. */
function withDoomedLowered<Play extends RestPlay>(outcome: RestOutcome<Play>): RestOutcome<Play> {
  const { play } = outcome;
  if (play.doomed === 0) {
    return outcome;
  }
  const lowered = Doomed.parse(play.doomed - 1);
  const next: Play = { ...play, ...withDoomed(trackOf(play), lowered) };
  return after(outcome, next, { kind: RestChangeKind.Doomed, doomed: lowered });
}

/**
 * Rest: heals Constitution modifier (at least 1) times level, eases the conditions the content eases on Rest (fatigued
 * is removed, drained lowered), and lowers doomed by 1.
 * Not idempotent: each rest eases them again.
 */
export function rested<Play extends RestPlay>(play: Play, limits: RestLimits): RestOutcome<Play> {
  const healed = withHealing(unchanged(play), limits);
  const eased = withConditionsEased(healed, limits);
  return withDoomedLowered(eased);
}

/** The counts of one kind that come back on a boundary, and what is left spent. */
interface RestoredCounts<Key extends CountKey> {
  readonly spent: Partial<Record<Key, ResourceCount>>;
  readonly restored: readonly {
    readonly key: Key;
    readonly amount: ResourceCount;
  }[];
}

/** `counts` with those counted on `boundary` back at 0 spent; counts with no maximum are left as they are. */
function restoredOn<Key extends CountKey>(
  counts: Partial<Record<Key, ResourceCount>>,
  maxima: ReadonlyMap<Key, CountedMaximum>,
  boundary: Boundary,
): RestoredCounts<Key> {
  const restored = [...maxima].flatMap(([key, known]) => {
    const amount = ResourceCount.parse(Math.min(counts[key] ?? NONE, known.max));
    return known.boundary === boundary && amount > NONE ? [{ key, amount }] : [];
  });
  const spent: Partial<Record<Key, ResourceCount>> = { ...counts };
  for (const { key } of restored) {
    spent[key] = NONE;
  }
  return { spent, restored };
}

/** Slots and uses that reset on `boundary` back, with what each regained. */
function withCountsRestored<Play extends RestPlay>(
  outcome: RestOutcome<Play>,
  { counted }: RestLimits,
  boundary: Boundary,
): RestOutcome<Play> {
  const { play } = outcome;
  const slots = restoredOn(play.resources.slots, counted.slots, boundary);
  const uses = restoredOn(play.resources.uses, counted.uses, boundary);
  const changes: readonly RestChange[] = [
    ...slots.restored.map(({ key, amount }): RestChange => ({
      kind: RestChangeKind.Slots,
      key,
      amount,
    })),
    ...uses.restored.map(({ key, amount }): RestChange => ({
      kind: RestChangeKind.Uses,
      key,
      amount,
    })),
  ];
  if (changes.length === 0) {
    return outcome;
  }
  const next: Play = {
    ...play,
    resources: { ...play.resources, slots: slots.spent, uses: uses.spent },
  };
  return { play: next, changes: [...outcome.changes, ...changes] };
}

/** A pool and the points it is to hold. */
interface PointsTarget {
  readonly resource: Resource;
  readonly to: ResourceCount;
}

/** `resource` set to hold `to`, within its pool, and recorded when that moves it. */
function withPointsSet<Play extends RestPlay>(
  outcome: RestOutcome<Play>,
  limits: RestLimits,
  { resource, to }: PointsTarget,
): RestOutcome<Play> {
  const { play } = outcome;
  const pools = poolsOf(play, limits);
  const from = heldIn(pools, resource);
  const spent = setPoints(pools, resource, to);
  const now = heldIn({ ...pools, spent }, resource);
  const change: RestChange = {
    kind: RestChangeKind.Points,
    resource,
    from,
    to: now,
  };
  return now === from ? outcome : after(outcome, { ...play, resources: spent }, change);
}

/**
 * Daily preparations: focus points full, the slots and uses that reset each day back, and the staff chosen prepared
 * with its charges.
 */
export function preparedDaily<Play extends RestPlay>(
  play: Play,
  limits: RestLimits,
  choice: StaffChoice = {},
): RestOutcome<Play> {
  const focused = withPointsSet(unchanged(play), limits, {
    resource: Resource.FocusPoints,
    to: limits.resources[Resource.FocusPoints],
  });
  return withStaffPrepared(withCountsRestored(focused, limits, Boundary.Day), limits, choice);
}

/** Refocus: one focus point back, if any is spent. */
export function refocused<Play extends RestPlay>(play: Play, limits: RestLimits): RestOutcome<Play> {
  const held = heldIn(poolsOf(play, limits), Resource.FocusPoints);
  const to = ResourceCount.parse(held + ONE);
  return withPointsSet(unchanged(play), limits, {
    resource: Resource.FocusPoints,
    to,
  });
}

/** Start of session: hero points to 1, and the uses that reset each session back. */
export function sessionStarted<Play extends RestPlay>(play: Play, limits: RestLimits): RestOutcome<Play> {
  const heroes = withPointsSet(unchanged(play), limits, {
    resource: Resource.HeroPoints,
    to: SESSION_HERO_POINTS,
  });
  return withCountsRestored(heroes, limits, Boundary.Session);
}

/** The outcome of `command` on `play`. */
export function applyRestCommand<Play extends RestPlay>(
  play: Play,
  command: RestCommand,
  limits: RestLimits,
): RestOutcome<Play> {
  switch (command.field) {
    case RestCommandField.Rest: {
      return rested(play, limits);
    }
    case RestCommandField.DailyPreparations: {
      return preparedDaily(play, limits, command);
    }
    case RestCommandField.Refocus: {
      return refocused(play, limits);
    }
    case RestCommandField.StartSession: {
      return sessionStarted(play, limits);
    }
    default: {
      return command satisfies never;
    }
  }
}
