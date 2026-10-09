import { DistanceUnitSchema, LocaleSchema } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * A signed-in user's display preferences. A field is absent until chosen, and absent shows the
 * defaults that signed-out visitors get: the source locale (`en`) and feet as written. Unknown
 * fields are rejected.
 */
export const Preferences = z.strictObject({
  uiLocale: LocaleSchema.optional(),
  contentLocale: LocaleSchema.optional(),
  distanceUnit: DistanceUnitSchema.optional(),
});
export type Preferences = z.output<typeof Preferences>;

/** Nothing chosen yet: what an account starts with. */
export const NO_PREFERENCES: Preferences = {};

/**
 * `current` with the fields `patch` gives; the rest keep their value. A PATCH body is a
 * `Preferences` too: a choice can be changed, not removed.
 */
export function patchPreferences(current: Preferences, patch: Preferences): Preferences {
  return {
    uiLocale: patch.uiLocale ?? current.uiLocale,
    contentLocale: patch.contentLocale ?? current.contentLocale,
    distanceUnit: patch.distanceUnit ?? current.distanceUnit,
  };
}
