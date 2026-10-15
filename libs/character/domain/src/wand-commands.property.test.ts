import { describe, expect, test } from 'bun:test';

import { array, assert, constantFrom, property } from 'fast-check';

import { wandOverchargeKey, wandUseKey } from './counted-resources';
import { FRESH_PLAY } from './play-state';
import type { PlayState } from './play-state';
import { afterWandCommand, CAST_WAND, fireballWand, overchargeWand, WAND_ID, wandSourceOf } from './testing';
import { wandOutcome, WandOutcome, wandProblem } from './wand-commands';
import type { WandCommand } from './wand-commands';

const WAND = fireballWand();
const COMMANDS: readonly WandCommand[] = [CAST_WAND, overchargeWand(15), overchargeWand(3), overchargeWand()];
const RUNS = array(constantFrom(...COMMANDS), { maxLength: 30 });
const CASTS_MAX_A_DAY = 2;
const COUNT_MAX = 1;

/** The play a wand command left, and whether it cast the spell. */
interface Step {
  readonly play: PlayState;
  readonly cast: boolean;
}

/** What a run of commands came to: the spells cast, and the play they left. */
interface Run {
  readonly casts: number;
  readonly play: PlayState;
}

/** `command` made when the wand allows it. */
function step(play: PlayState, command: WandCommand): Step {
  const source = wandSourceOf([WAND], play);
  if (source === undefined || wandProblem(command, source) !== undefined) {
    return { play, cast: false };
  }
  const cast = wandOutcome(command, source) !== WandOutcome.Destroyed;
  return { play: afterWandCommand(play, [WAND], command), cast };
}

function run(commands: readonly WandCommand[]): Run {
  let play = FRESH_PLAY;
  let casts = 0;
  for (const command of commands) {
    const next = step(play, command);
    ({ play } = next);
    casts += next.cast ? 1 : 0;
  }
  return { casts, play };
}

describe('a wand cast (properties)', () => {
  test('is never cast more than twice a day', () => {
    assert(
      property(RUNS, (commands) => {
        const { casts } = run(commands);
        expect(casts).toBeLessThanOrEqual(CASTS_MAX_A_DAY);
      }),
    );
  });

  test('never takes the day cast or the overcharge past the one each has', () => {
    assert(
      property(RUNS, (commands) => {
        const { uses } = run(commands).play.resources;
        expect(uses[wandUseKey(WAND_ID)] ?? 0).toBeLessThanOrEqual(COUNT_MAX);
        expect(uses[wandOverchargeKey(WAND_ID)] ?? 0).toBeLessThanOrEqual(COUNT_MAX);
      }),
    );
  });
});
