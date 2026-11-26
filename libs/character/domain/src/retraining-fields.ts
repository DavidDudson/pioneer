import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The days a month of retraining takes. */
const MONTH_DAYS = 30;

/** A number of days of retraining work: one to a month. */
export const RetrainDays = Pg.smallint().min(1).max(MONTH_DAYS).brand<'RetrainDays'>();

export type RetrainDays = z.infer<typeof RetrainDays>;

/** The days of a project already worked: none up to its days needed. */
export const RetrainProgress = Pg.smallint().min(0).max(MONTH_DAYS).brand<'RetrainProgress'>();

export type RetrainProgress = z.infer<typeof RetrainProgress>;

/** A character's one retraining: the pick in `slot` is swapped for `to` once `daysNeeded` days are worked. */
export const RetrainingProject = z.strictObject({
  slot: SlotKey,
  to: ChoiceValue,
  /** Kept from the day the project started, so a later rules change doesn't move a project under way. */
  daysNeeded: RetrainDays,
  daysDone: RetrainProgress,
});

export type RetrainingProject = z.infer<typeof RetrainingProject>;

const WEEK = RetrainDays.parse(7);
const MONTH = RetrainDays.parse(MONTH_DAYS);

/** The slot kinds that take a week to retrain, by the start of their key. */
const WEEK_PREFIXES = ['feat:', 'skill-increase:', 'repertoire:'] as const;

/** The slot kinds that take a month: a class choice. */
const MONTH_PREFIXES = ['choice:'] as const;

/** The days retraining `slot` takes: a week, or a month for a class choice; undefined when it can't be retrained. */
export function retrainDaysFor(slot: SlotKey): RetrainDays | undefined {
  if (WEEK_PREFIXES.some((prefix) => slot.startsWith(prefix))) {
    return WEEK;
  }

  return MONTH_PREFIXES.some((prefix) => slot.startsWith(prefix)) ? MONTH : undefined;
}
