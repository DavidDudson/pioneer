import { EarnDays, TaskLevel } from '@pioneer/character/domain';
import { DegreeOfSuccessSchema } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * What the form checks while it is filled in: the task level and days use the schemas the server validates with, and
 * the degree is any of the degrees, as a string like the model's.
 */
export const EarnIncomeDraftSchema = z.object({
  skill: z.string().min(1),
  level: TaskLevel,
  days: EarnDays,
  degree: z.string().refine((degree) => DegreeOfSuccessSchema.safeParse(degree).success),
});

/** What it submits: the same, with the degree as one of the degrees. */
export const EarnIncomeSubmissionSchema = EarnIncomeDraftSchema.extend({ degree: DegreeOfSuccessSchema });

/** The form's model. Signal forms need concrete field types, so a degree not yet rolled is ''. */
export interface EarnIncomeModel {
  readonly skill: string;
  readonly level: number;
  readonly days: number;
  readonly degree: string;
}

export const EMPTY_EARN_INCOME: EarnIncomeModel = { skill: '', level: 0, days: 1, degree: '' };
