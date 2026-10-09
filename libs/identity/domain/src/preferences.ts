import { DistanceUnitSchema, LocaleSchema } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * A signed-in user's display preferences. `null` means not chosen, which shows the defaults that
 * signed-out visitors get: the source locale (`en`) and feet as written.
 */
export const Preferences = z.strictObject({
  uiLocale: LocaleSchema.nullable(),
  contentLocale: LocaleSchema.nullable(),
  distanceUnit: DistanceUnitSchema.nullable(),
});
export type Preferences = z.output<typeof Preferences>;

/** Nothing chosen yet: what an account starts with. */
export const NO_PREFERENCES: Preferences = { uiLocale: null, contentLocale: null, distanceUnit: null };

/** PATCH body: only the fields given change; `null` clears a choice. Unknown fields are rejected. */
export const PreferencesPatch = Preferences.partial();
export type PreferencesPatch = z.output<typeof PreferencesPatch>;

/** `current` with the fields `patch` gives; an absent field keeps its value, `null` clears it. */
export function patchPreferences(current: Preferences, patch: PreferencesPatch): Preferences {
  return {
    uiLocale: patch.uiLocale === undefined ? current.uiLocale : patch.uiLocale,
    contentLocale: patch.contentLocale === undefined ? current.contentLocale : patch.contentLocale,
    distanceUnit: patch.distanceUnit === undefined ? current.distanceUnit : patch.distanceUnit,
  };
}
