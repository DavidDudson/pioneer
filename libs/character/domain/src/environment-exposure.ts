import { ContentId } from '@pioneer/rules/sdk';
import type { EnvironmentConsequence } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { durationRounds } from './effects';
import { ENVIRONMENTS_MAX } from './environments';
import type { EnvironmentCommand } from './environments';

const NONE = 0;
const ONCE = 1;
const EXPOSURE_ROUNDS_MAX = 10_000_000;
/** The most times one consequence happens in a single passing of time, so a long wait cannot loop without end. */
const OCCURRENCES_MAX = 144;

/** Rounds spent in an environment, a round being 6 seconds. */
export const ExposureRounds = z.int().min(NONE).max(EXPOSURE_ROUNDS_MAX).brand<'ExposureRounds'>();
export type ExposureRounds = z.infer<typeof ExposureRounds>;

/** How long the character has been in one environment. */
const ExposureEntrySchema = z.strictObject({ environment: ContentId, elapsed: ExposureRounds });

/** The time spent in each environment the character is in, which its consequences are measured against. */
export const ExposureSchema = z.array(ExposureEntrySchema).max(ENVIRONMENTS_MAX).readonly().default([]);
export type Exposure = z.infer<typeof ExposureSchema>;

/** A span of time as the content writes it: a count of one unit. */
export type EnvironmentDuration = EnvironmentConsequence['after'];

/** `duration` in rounds, kept within what exposure holds. */
export function spanRounds({ count, unit }: EnvironmentDuration): ExposureRounds {
  return ExposureRounds.parse(Math.min(durationRounds(count, unit), EXPOSURE_ROUNDS_MAX));
}

/** The time spent in `environment`; none for one the character has just entered. */
export function elapsedIn(exposure: Exposure, environment: ContentId): ExposureRounds {
  return exposure.find((entry) => entry.environment === environment)?.elapsed ?? ExposureRounds.parse(NONE);
}

/** `exposure` with `elapsed` in `environment`, which it lists once, in the place it had. */
export function exposureWith(exposure: Exposure, environment: ContentId, elapsed: ExposureRounds): Exposure {
  const listed = exposure.some((entry) => entry.environment === environment);
  return listed
    ? exposure.map((entry) => (entry.environment === environment ? { environment, elapsed } : entry))
    : [...exposure, { environment, elapsed }];
}

/** `exposure` after an environment is turned on (the clock starts at none) or off (it is forgotten). */
export function exposureAfterCommand(exposure: Exposure, { environment, active }: EnvironmentCommand): Exposure {
  const listed = exposure.some((entry) => entry.environment === environment);
  if (!active) {
    return exposure.filter((entry) => entry.environment !== environment);
  }
  return listed || exposure.length >= ENVIRONMENTS_MAX
    ? exposure
    : [...exposure, { environment, elapsed: ExposureRounds.parse(NONE) }];
}

/** `before` with `rounds` more, kept within what exposure holds. */
export function exposureAfter(before: ExposureRounds, rounds: ExposureRounds): ExposureRounds {
  return ExposureRounds.parse(Math.min(before + rounds, EXPOSURE_ROUNDS_MAX));
}

/** How many times a consequence happens in one passing of time. */
export const OccurrenceCount = z.int().min(NONE).max(OCCURRENCES_MAX).brand<'OccurrenceCount'>();
export type OccurrenceCount = z.infer<typeof OccurrenceCount>;

/** How many times `consequence` happens as the time in the environment goes from `before` to `after`. */
export function occurrences(
  before: ExposureRounds,
  after: ExposureRounds,
  consequence: EnvironmentConsequence,
): OccurrenceCount {
  const period = spanRounds(consequence.after);
  if (consequence.repeats === true) {
    return OccurrenceCount.parse(Math.min(Math.floor(after / period) - Math.floor(before / period), OCCURRENCES_MAX));
  }
  return OccurrenceCount.parse(before < period && after >= period ? ONCE : NONE);
}
