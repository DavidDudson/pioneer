import { describe, expect, test } from 'bun:test';

import { DedicationLock } from '@pioneer/rules/sdk';

import { kindDataReport } from './dry-run-report';
import { KindDataGapReason } from './kind-data-gaps';
import { ARCHETYPES_JOURNAL, BASIC_MANEUVER, BUILD, FIGHTER } from './testing/build-fixtures';
import { gapKeys } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';

const translation = translate(BUILD, { journals: [ARCHETYPES_JOURNAL] });

describe('the dedication lock report', () => {
  test('a dedication feat no archetype page names is reported, so its lock never silently turns off', () => {
    const orphan = translate(
      BUILD.filter(({ id }) => id !== FIGHTER.id),
      { journals: [{ ...ARCHETYPES_JOURNAL, journal: { ...ARCHETYPES_JOURNAL.journal, pages: [] } }] },
    );

    expect(orphan.archetypes).toEqual([]);
    expect(orphan.kindDataGaps).toContainEqual({
      entry: idOf('feat:fighter-dedication'),
      reason: KindDataGapReason.MissingArchetype,
      field: 'dedication',
      raw: 'Fighter Dedication',
    });
  });

  test('the report lists an archetype with a dedication lock of its own, and none while the import sets none', () => {
    const locked = {
      ...translation,
      archetypes: translation.archetypes.map((each) => ({
        ...each,
        kindData: { ...each.kindData, data: { ...each.kindData.data, dedicationLock: DedicationLock.parse(3) } },
      })),
    };

    expect(kindDataReport(translation).dedicationLocks).toEqual([]);
    expect(kindDataReport(locked).dedicationLocks).toEqual([{ key: 'archetype:fighter 3', count: 1 }]);
  });

  test('a dedication feat with its archetype is not reported', () => {
    expect(gapKeys(translation)).not.toContain('missing-archetype dedication');
  });

  test('dedications are not checked without the journals, which hold the archetypes', () => {
    expect(gapKeys(translate(BUILD))).not.toContain('missing-archetype dedication');
  });

  test('an archetype feat whose archetype was not imported is reported against the feat', () => {
    const orphan = translate([BASIC_MANEUVER], { journals: [ARCHETYPES_JOURNAL] });

    expect(orphan.archetypes).toEqual([]);
    expect(gapsOf(orphan)).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'archetype',
      raw: [],
    });
  });
});
