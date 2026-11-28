import { RaisedRank } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** The highest level of a task: work only a legend of the skill is offered. */
export const TASK_LEVEL_MAX = 20;

/** The level of a task: 0 for the odd job, up to 20. */
export const TaskLevel = Pg.smallint().min(0).max(TASK_LEVEL_MAX).brand<'TaskLevel'>();

export type TaskLevel = z.infer<typeof TaskLevel>;

/** The most days one Earn Income covers: a year. */
const EARN_DAYS_MAX = 365;

/** How many days a task is worked. */
export const EarnDays = Pg.smallint().min(1).max(EARN_DAYS_MAX).brand<'EarnDays'>();

export type EarnDays = z.infer<typeof EarnDays>;

/** The ranks that can earn income: the table has no column for an untrained one. */
export const EarnRank = RaisedRank;

export type EarnRank = z.infer<typeof EarnRank>;
