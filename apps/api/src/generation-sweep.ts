import { CharacterLevel } from '@pioneer/character/domain';
import * as z from 'zod';

/**
 * How much of the generation property space a test run covers. A pull request runs the `pr` sweep: a few runs at a few
 * levels from a fixed seed, so the same code gives the same result. The nightly workflow runs the `full` one, with a
 * fresh seed each night; a failure prints that seed, and
 *
 *     GENERATION_SWEEP=full GENERATION_SEED=<seed> [GENERATION_PATH=<path>] bun test <file>
 *
 * replays it locally (`path` is the shrunk case fast-check prints beside the seed).
 */
export const SweepMode = { Pr: 'pr', Full: 'full' } as const;

const SweepEnv = z.object({
  GENERATION_SWEEP: z.enum([SweepMode.Pr, SweepMode.Full]).default(SweepMode.Pr),
  GENERATION_SEED: z.coerce.number().int().nonnegative().optional(),
  GENERATION_PATH: z.string().min(1).optional(),
});

/** The runs a pull request makes of a property test, at most. */
const PR_RUNS = 3;

/** The seed a pull request run starts from. */
const PR_SEED = 20_260_101;

const FIRST_LEVEL = 1;
const FIFTH_LEVEL = 5;
const MID_LEVEL = 10;
const FIFTEENTH_LEVEL = 15;
const LAST_LEVEL = 20;
const FULL_SPOT_LEVELS = [FIRST_LEVEL, FIFTH_LEVEL, MID_LEVEL, FIFTEENTH_LEVEL, LAST_LEVEL];
const PR_SPOT_LEVELS = [FIRST_LEVEL, LAST_LEVEL];
const PR_PROPERTY_LEVELS = [FIRST_LEVEL, MID_LEVEL, LAST_LEVEL];
const ALL_LEVELS = Array.from({ length: LAST_LEVEL }, (_unused, index) => index + FIRST_LEVEL);

/** What `fast-check`'s `assert` takes: how many runs, and where to start. */
export interface SweepParameters {
  numRuns: number;
  seed?: number;
  path?: string;
}

export interface Sweep {
  readonly mode: (typeof SweepMode)[keyof typeof SweepMode];
  /** The levels a test walks one by one for each class. */
  readonly spotLevels: readonly CharacterLevel[];
  /** The levels a property test draws from. */
  readonly propertyLevels: readonly CharacterLevel[];
  /** The `assert` options for a property test that makes `fullRuns` runs in the full sweep. */
  parameters: (fullRuns: number) => SweepParameters;
}

function levelsOf(levels: readonly number[]): readonly CharacterLevel[] {
  return levels.map((level) => CharacterLevel.parse(level));
}

/** The sweep `env` asks for; an unknown `GENERATION_SWEEP` throws. */
export function sweepOf(env: Readonly<Record<string, string | undefined>>): Sweep {
  const parsed = SweepEnv.parse(env);
  const isFull = parsed.GENERATION_SWEEP === SweepMode.Full;
  const seed = parsed.GENERATION_SEED ?? (isFull ? undefined : PR_SEED);

  return {
    mode: parsed.GENERATION_SWEEP,
    spotLevels: levelsOf(isFull ? FULL_SPOT_LEVELS : PR_SPOT_LEVELS),
    propertyLevels: levelsOf(isFull ? ALL_LEVELS : PR_PROPERTY_LEVELS),
    parameters: (fullRuns) => {
      const parameters: SweepParameters = {
        numRuns: isFull ? fullRuns : Math.min(fullRuns, PR_RUNS),
      };

      if (seed !== undefined) {
        parameters.seed = seed;
      }

      if (parsed.GENERATION_PATH !== undefined) {
        parameters.path = parsed.GENERATION_PATH;
      }

      return parameters;
    },
  };
}

export const sweep: Sweep = sweepOf(Bun.env);
