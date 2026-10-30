import type { ContentId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { isSuffocating } from './breath';
import { ConditionInstanceId, conditionProblem, UNLIMITED } from './conditions';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayLimits } from './play-state';
import { fellUnconscious } from './turn-events';
import type { TurnOutcome } from './turn-start';

/** What falling unconscious out of air reads: the limits the condition is added within, and the content's condition. */
interface UnconsciousInputs {
  readonly limits: PlayLimits;
  /** The Unconscious condition of the content; none when the content has none. */
  readonly unconscious?: ContentId | undefined;
}

/**
 * A character out of air falls unconscious: the content's Unconscious condition goes on as any condition does, and the
 * breath remembers which instance it was, so breathing again takes that one off. Nothing happens for a character that
 * already has it from this breath, that is dead, or when the content has no such condition or refuses it.
 */
export function outOfAir(outcome: TurnOutcome, { limits, unconscious }: UnconsciousInputs): TurnOutcome {
  const { play } = outcome;
  const { breath, dead } = play;
  if (
    breath === undefined ||
    breath.unconscious !== undefined ||
    !isSuffocating(breath) ||
    dead ||
    unconscious === undefined
  ) {
    return outcome;
  }
  const id = ConditionInstanceId.parse(newId());
  const command = {
    field: PlayCommandField.AddCondition,
    condition: { id, condition: unconscious, duration: UNLIMITED },
  } as const;
  if (conditionProblem(play.conditions, command, limits.valued) !== undefined) {
    return outcome;
  }
  const added = applyPlayCommand(play, command, limits);
  return {
    play: { ...added, breath: { ...breath, unconscious: id } },
    events: [...outcome.events, fellUnconscious(unconscious, id)],
  };
}
