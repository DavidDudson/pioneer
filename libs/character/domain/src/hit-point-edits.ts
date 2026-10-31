import { DamageTotal } from '@pioneer/rules/dice';
import type { DamageApplication } from '@pioneer/rules/dice';
import { HitPoints } from '@pioneer/rules/sdk';

import { criticallyHit } from './breath';
import { knockedOut, recovered } from './death-track';
import type { DeathTrack } from './death-track';
import type { HitPointsState, PlayState } from './play-state';

const NONE = HitPoints.parse(0);

/** `value`, or `max` when it is more. */
function atMost(value: HitPoints, max: HitPoints): HitPoints {
  return HitPoints.parse(Math.min(value, max));
}

/** `from` less `amount`, never below 0. */
function less(from: HitPoints, amount: HitPoints | DamageTotal): HitPoints {
  return HitPoints.parse(Math.max(from - amount, 0));
}

/** `from` plus `amount`, never past `max`. */
function plus(from: HitPoints, amount: DamageTotal, max: HitPoints): HitPoints {
  return HitPoints.parse(Math.min(from + amount, max));
}

/** Current Hit Points: the maximum less the damage taken, never below 0. */
export function currentHitPoints(hp: HitPointsState, max: HitPoints): HitPoints {
  return less(max, atMost(hp.damage, max));
}

/** `play` with `temp` temporary Hit Points gained: they don't stack, so the higher of the two is kept. Needs no maximum. */
export function withTempHitPoints(play: PlayState, temp: HitPoints): PlayState {
  return {
    ...play,
    hp: { ...play.hp, temp: HitPoints.parse(Math.max(play.hp.temp, temp)) },
  };
}

/** The death track of `play`. */
export function trackOf({ dying, wounded, doomed, dead }: PlayState): DeathTrack {
  return { dying, wounded, doomed, dead };
}

/** `play` with its death track replaced by `track`. */
export function withTrack(play: PlayState, track: DeathTrack): PlayState {
  return { ...play, ...track };
}

/** `play` after Hit Points moved from `before` to `after` without being damaged: coming back above 0 ends dying. */
function afterRestoring(play: PlayState, before: HitPoints, after: HitPoints): PlayState {
  const revived = before === NONE && after > NONE;
  return revived ? withTrack(play, recovered(trackOf(play))) : play;
}

/** `play` after `application` of damage: temporary Hit Points take it first, and what gets through at 0 advances dying. A critical hit also costs a character holding its breath a round of air. */
export function afterDamage(play: PlayState, application: DamageApplication, max: HitPoints): PlayState {
  const { hp } = play;
  const { taken, critical } = application;
  const absorbed = HitPoints.parse(Math.min(hp.temp, taken));
  const through = DamageTotal.parse(taken - absorbed);
  const damage = plus(atMost(hp.damage, max), through, max);
  const hurt: PlayState = {
    ...play,
    hp: { temp: less(hp.temp, absorbed), damage },
    ...(critical && play.breath !== undefined && { breath: criticallyHit(play.breath) }),
  };
  const down = through > NONE && currentHitPoints(hurt.hp, max) === NONE;
  return down ? withTrack(hurt, knockedOut(trackOf(hurt), critical)) : hurt;
}

/** `play` after healing `amount`: Hit Points back above 0 end dying. */
export function afterHealing(play: PlayState, amount: HitPoints, max: HitPoints): PlayState {
  const { hp } = play;
  const healed: PlayState = {
    ...play,
    hp: { ...hp, damage: less(atMost(hp.damage, max), amount) },
  };
  return afterRestoring(healed, currentHitPoints(hp, max), currentHitPoints(healed.hp, max));
}

/** `play` with Hit Points set to `current`: a drop to 0 is knocked out, a rise above it ends dying. */
export function afterSetting(play: PlayState, current: HitPoints, max: HitPoints): PlayState {
  const { hp } = play;
  const before = currentHitPoints(hp, max);
  const set: PlayState = {
    ...play,
    hp: { ...hp, damage: less(max, atMost(current, max)) },
  };
  const after = currentHitPoints(set.hp, max);
  const down = before > NONE && after === NONE;
  return down ? withTrack(set, knockedOut(trackOf(set), false)) : afterRestoring(set, before, after);
}
