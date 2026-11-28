import { CharacterId } from '@pioneer/character/domain';
import { DamageApplication, DegreeResult, DiceExpression, FortunedRoll } from '@pioneer/rules/dice';
import type { StatisticValue } from '@pioneer/rules/engine';
import { Dc } from '@pioneer/rules/sdk';
import type { CheckNode } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** How many rolls a character keeps; the oldest go first. */
export const ROLL_HISTORY_CAP = 100;

/** A statistic's breakdown as kept: plain data the engine produced, read back as it was written. */
const KeptStatistic = z.custom<StatisticValue>(
  (value) => value instanceof Object && 'selector' in value && 'total' in value,
);

/** The check in text a roll was made for, as kept: the text was read when it was rolled, so it is not read again. */
const KeptCheck = z.custom<CheckNode>((value) => value instanceof Object && 'statistic' in value);

/**
 * One roll as it was made: the check, the dice that fell, the breakdown and toggles it was rolled with, the DC and
 * the degree it reached. It keeps all of it, so it shows as rolled however the character changes later.
 */
export const RollHistoryEntry = z.object({
  character: CharacterId,
  /** When it was rolled, in milliseconds since the epoch. */
  at: z.number().int().nonnegative(),
  name: z.string(),
  expression: DiceExpression,
  roll: FortunedRoll,
  reasons: z.array(z.string()).readonly(),
  /** Unset for damage, which has no statistic. */
  statistic: KeptStatistic.optional(),
  check: KeptCheck.optional(),
  dc: Dc.optional(),
  degree: DegreeResult.optional(),
  damage: DamageApplication.optional(),
});

export type RollHistoryEntry = z.infer<typeof RollHistoryEntry>;

/** An entry with the key the store knows it by. Keys grow with each roll, so they also order them. */
export interface KeptRoll {
  readonly key: number;
  readonly entry: RollHistoryEntry;
}

/** Port: where the browser keeps each character's rolls between visits. Rolls are solo play's; they are not synced. */
export interface RollHistoryStore {
  /** The character's rolls, newest first. An entry that no longer reads is left out. */
  readonly list: (character: CharacterId) => Promise<ReadonlyArray<KeptRoll>>;
  /** Keeps `entry` as the newest, then drops the oldest beyond `cap`; answers the key it was kept under. */
  readonly append: (entry: RollHistoryEntry, cap: number) => Promise<number>;
  /** Rewrites the entry under `key`, as when a DC is typed after the roll. */
  readonly replace: (key: number, entry: RollHistoryEntry) => Promise<void>;
  /** Drops every roll the character has. */
  readonly clear: (character: CharacterId) => Promise<void>;
}
