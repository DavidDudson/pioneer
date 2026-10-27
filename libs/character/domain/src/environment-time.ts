import { applyDamage } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import { DamageFormula, EnvironmentDamageCategory } from '@pioneer/rules/sdk';
import type { ContentId, DamageTarget, EnvironmentConsequence, EnvironmentDamage } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { ConditionInstanceId, UNLIMITED } from './conditions';
import { elapsedIn, exposureAfter, exposureWith, occurrences, spanRounds } from './environment-exposure';
import type { EnvironmentDuration, ExposureRounds } from './environment-exposure';
import type { EnvironmentContent } from './environments';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import { rolled } from './turn-end';
import { environmentConditioned, environmentDamaged } from './turn-events';
import type { TurnEvent } from './turn-events';
import type { TurnOutcome } from './turn-start';

/** What time passing reads besides the play state. */
export interface PassTimeInputs {
  readonly limits: PlayLimits;
  /** The character's immunities, weaknesses and resistances, which the damage goes through. */
  readonly defences: DamageTarget;
  /** What the environments of the content do to a character that stays in them. */
  readonly environments: EnvironmentContent;
  /** Where the dice come from. */
  readonly random: RandomSource;
}

/**
 * The dice of each damage category. GM Core gives a range for each (minor 1d6 to 2d6, moderate 4d6 to 6d6, major 8d6 to
 * 12d6, massive 16d6 to 24d6) for the GM to pick within; the lowest is used here.
 */
const CATEGORY_DICE: Readonly<Record<EnvironmentDamageCategory, DamageFormula>> = {
  [EnvironmentDamageCategory.Minor]: DamageFormula.parse('1d6'),
  [EnvironmentDamageCategory.Moderate]: DamageFormula.parse('4d6'),
  [EnvironmentDamageCategory.Major]: DamageFormula.parse('8d6'),
  [EnvironmentDamageCategory.Massive]: DamageFormula.parse('16d6'),
};

/** The state and events of a passing of time so far, and what it needs to go on. */
interface Passing {
  readonly outcome: TurnOutcome;
  readonly inputs: PassTimeInputs;
}

/** `passing` moved on to `play`, with the `events` that led there. */
function moved({ outcome, inputs }: Passing, play: PlayState, events: readonly TurnEvent[]): Passing {
  return { outcome: { play, events: [...outcome.events, ...events] }, inputs };
}

/** One time the environment `environment` deals `damage`: the dice roll, go through the defences and take the Hit Points. */
function damaged(passing: Passing, environment: ContentId, damage: EnvironmentDamage): Passing {
  const { play } = passing.outcome;
  const roll = rolled(
    { formula: CATEGORY_DICE[damage.category], type: damage.type, assisted: false },
    passing.inputs.random,
  );
  if (play.dead || roll === undefined) {
    return passing;
  }
  const applied = applyDamage(roll, passing.inputs.defences);
  const hurt = applyPlayCommand(play, { field: PlayCommandField.Damage, damage: applied }, passing.inputs.limits);
  return moved(passing, hurt, [environmentDamaged(environment, { roll, damage: applied })]);
}

/** One time the environment `environment` puts `condition` on the character, unless it already has it. */
function conditioned(passing: Passing, environment: ContentId, condition: ContentId): Passing {
  const { play } = passing.outcome;
  if (play.dead || play.conditions.some((each) => each.condition === condition)) {
    return passing;
  }
  const instance = ConditionInstanceId.parse(newId());
  const added = applyPlayCommand(
    play,
    { field: PlayCommandField.AddCondition, condition: { id: instance, condition, duration: UNLIMITED } },
    passing.inputs.limits,
  );
  return moved(passing, added, [environmentConditioned(environment, condition, instance)]);
}

/** One time `consequence` of `environment` happens. */
function happened(passing: Passing, environment: ContentId, consequence: EnvironmentConsequence): Passing {
  const { applies, damage } = consequence;
  if (damage !== undefined) {
    return damaged(passing, environment, damage);
  }
  return applies === undefined ? passing : conditioned(passing, environment, applies);
}

/** Each consequence of `environment` that the time from `before` to `after` brings about, as often as it does. */
function consequences(
  passing: Passing,
  environment: ContentId,
  span: { readonly before: ExposureRounds; readonly after: ExposureRounds },
): Passing {
  let current = passing;
  for (const consequence of passing.inputs.environments.get(environment)?.consequences ?? []) {
    const times = occurrences(span.before, span.after, consequence);
    for (let each = 0; each < times; each += 1) {
      current = happened(current, environment, consequence);
    }
  }
  return current;
}

/** `passing` after `rounds` more rounds in `environment`: the clock moves on, then its consequences happen. */
function stayed(passing: Passing, environment: ContentId, rounds: ExposureRounds): Passing {
  const { play } = passing.outcome;
  const before = elapsedIn(play.exposure, environment);
  const after = exposureAfter(before, rounds);
  const timed = moved(passing, { ...play, exposure: [...exposureWith(play.exposure, environment, after)] }, []);
  return consequences(timed, environment, { before, after });
}

/**
 * Time passes: each environment the character is in has that much more time spent in it, and the consequences its
 * content lists for that time happen (heat and cold deal damage on a schedule, long exposure makes a character
 * fatigued). Damage goes through the character's defences; a dead character takes nothing, and a condition the
 * character has is not put on again. Dice come from `random`.
 */
export function passTime(play: PlayState, duration: EnvironmentDuration, inputs: PassTimeInputs): TurnOutcome {
  const rounds = spanRounds(duration);
  let passing: Passing = { outcome: { play, events: [] }, inputs };
  for (const environment of play.environments) {
    passing = stayed(passing, environment, rounds);
  }
  return passing.outcome;
}
