import { DegreeOfSuccess } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** The highest value a death-track condition takes: dying 4 is death. */
export const DEATH_VALUE_MAX = 4;

/** The dying condition's value: 0 when not dying, up to the 4 at which a character dies at doomed 0. */
export const Dying = z.int().min(0).max(DEATH_VALUE_MAX).brand<'Dying'>();
export type Dying = z.infer<typeof Dying>;

/** The wounded condition's value: how much worse the next dying is. Dying 4 is death, so 4 is as high as it matters. */
export const Wounded = z.int().min(0).max(DEATH_VALUE_MAX).brand<'Wounded'>();
export type Wounded = z.infer<typeof Wounded>;

/** The doomed condition's value: each point lowers the dying value that kills, so doomed 4 is death at dying 0. */
export const Doomed = z.int().min(0).max(DEATH_VALUE_MAX).brand<'Doomed'>();
export type Doomed = z.infer<typeof Doomed>;

const NONE = 0;
const ONE = 1;
const TWO = 2;

/**
 * Where a character stands on the death track, as inputs: the three conditions as the table has them, and whether the
 * character has died. Death is recorded when it happens rather than read off `dying` and `doomed`, because it holds
 * after a later change to either: a dead character is shown, never revived by lowering doomed.
 */
export const DeathTrackSchema = z.strictObject({
  dying: Dying.default(Dying.parse(NONE)),
  wounded: Wounded.default(Wounded.parse(NONE)),
  doomed: Doomed.default(Doomed.parse(NONE)),
  dead: z.boolean().default(false),
});
export type DeathTrack = z.infer<typeof DeathTrackSchema>;

/** A character with no conditions who is alive. */
export const FRESH_DEATH_TRACK: DeathTrack = DeathTrackSchema.parse({});

/** The dying value at which a character with `doomed` dies: 4 less the doomed value. */
export function deathThreshold(doomed: Doomed): Dying {
  return Dying.parse(DEATH_VALUE_MAX - doomed);
}

/** A condition's value plus what is gained or lost: from dying 0 less 2 up to dying 4, 2 more and wounded 4. */
const ConditionSum = z
  .int()
  .min(-TWO)
  .max(DEATH_VALUE_MAX + TWO + DEATH_VALUE_MAX)
  .brand<'ConditionSum'>();

/** A sum held to the 0 to 4 a condition's value spans, as a dying value. */
const DyingNear = ConditionSum.transform((value) => Math.min(Math.max(value, NONE), DEATH_VALUE_MAX)).pipe(Dying);

/** A sum held to the 0 to 4 a condition's value spans, as a wounded value. */
const WoundedNear = ConditionSum.transform((value) => Math.min(Math.max(value, NONE), DEATH_VALUE_MAX)).pipe(Wounded);

/** `track` with death recorded if its dying value has reached what its doomed value allows. A death already recorded stays. */
function settled(track: DeathTrack): DeathTrack {
  return track.dead || track.dying >= deathThreshold(track.doomed) ? { ...track, dead: true } : track;
}

/**
 * The dying condition gained when a character is dropped to 0 Hit Points, or hurt while at 0 (a critical hit makes it
 * 2 instead of 1). A character who isn't dying yet also takes on its wounded value; one who is dying takes the
 * increase alone. Nothing changes for a character who has died.
 */
export function knockedOut(track: DeathTrack, critical: boolean): DeathTrack {
  if (track.dead) {
    return track;
  }
  const gain = critical ? TWO : ONE;
  const carried = track.dying > NONE ? NONE : track.wounded;
  return settled({ ...track, dying: DyingNear.parse(track.dying + gain + carried) });
}

/** The dying condition lost to healing or a recovery check: it ends and the character is wounded 1 (or one more). */
export function recovered(track: DeathTrack): DeathTrack {
  if (track.dead || track.dying === NONE) {
    return track;
  }
  return { ...track, dying: Dying.parse(NONE), wounded: WoundedNear.parse(track.wounded + ONE) };
}

/** How a recovery check's degree moves the dying value: success eases it, failure worsens it, critical doubles it. */
const RECOVERY_CHANGE: Readonly<Record<DegreeOfSuccess, number>> = {
  [DegreeOfSuccess.CriticalSuccess]: -TWO,
  [DegreeOfSuccess.Success]: -ONE,
  [DegreeOfSuccess.Failure]: ONE,
  [DegreeOfSuccess.CriticalFailure]: TWO,
};

/**
 * `track` after a recovery check that came out at `degree`. Reaching dying 0 ends the condition and gains wounded;
 * reaching the death threshold is death. A character who isn't dying has nothing to recover from.
 */
export function afterRecoveryCheck(track: DeathTrack, degree: DegreeOfSuccess): DeathTrack {
  if (track.dead || track.dying === NONE) {
    return track;
  }
  const dying = DyingNear.parse(track.dying + RECOVERY_CHANGE[degree]);
  return dying === NONE ? recovered(track) : settled({ ...track, dying });
}

/** `track` with dying corrected to `dying`: the one edit that can undo a recorded death, for a mistake at the table. */
export function withDying(track: DeathTrack, dying: Dying): DeathTrack {
  return { ...track, dying, dead: dying >= deathThreshold(track.doomed) };
}

export function withWounded(track: DeathTrack, wounded: Wounded): DeathTrack {
  return { ...track, wounded };
}

/** `track` with doomed changed; a doomed value that makes the current dying value fatal is death. */
export function withDoomed(track: DeathTrack, doomed: Doomed): DeathTrack {
  return settled({ ...track, doomed });
}

/** `track` with dying ended and wounded left as it is: what Heroic Recovery does, unlike the recovery that wounds. */
export function stabilised(track: DeathTrack): DeathTrack {
  return track.dead || track.dying === NONE ? track : { ...track, dying: Dying.parse(NONE) };
}
