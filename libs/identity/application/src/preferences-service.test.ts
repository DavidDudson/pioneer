import { describe, expect, test } from 'bun:test';

import { NO_PREFERENCES, UserId } from '@pioneer/identity/domain';
import { DistanceUnit, fixedClock, Locale, newId } from '@pioneer/shared/kernel';

import { InMemoryPreferencesRepository } from './in-memory-preferences-repository';
import { PreferencesService } from './preferences-service';

function service(): PreferencesService {
  return new PreferencesService(new InMemoryPreferencesRepository(), fixedClock('2026-10-09T08:00:00Z'));
}

describe('PreferencesService', () => {
  test('a user who never chose has nothing chosen', async () => {
    const preferences = await service().get(UserId.parse(newId()));
    expect(preferences).toStrictEqual(NO_PREFERENCES);
  });

  test('an update changes only the fields it gives', async () => {
    const preferences = service();
    const amiri = UserId.parse(newId());
    await preferences.update(amiri, { uiLocale: Locale.English });
    const updated = await preferences.update(amiri, { distanceUnit: DistanceUnit.Metres });
    expect(updated).toEqual({ uiLocale: Locale.English, distanceUnit: DistanceUnit.Metres });
    expect(await preferences.get(amiri)).toEqual(updated);
  });

  test("one user's choices never reach another", async () => {
    const preferences = service();
    const [amiri, ezren] = [UserId.parse(newId()), UserId.parse(newId())];
    await preferences.update(amiri, { distanceUnit: DistanceUnit.Metres });
    expect(await preferences.get(ezren)).toStrictEqual(NO_PREFERENCES);
  });
});
