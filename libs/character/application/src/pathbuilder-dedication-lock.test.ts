import { describe, expect, test } from 'bun:test';

import { DEDICATION_FIXTURES } from '@pioneer/character/domain/testing';
import { PathbuilderName, registryLookup } from '@pioneer/interop/pathbuilder';
import type { ImportedFeat } from '@pioneer/interop/pathbuilder';
import { mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { ContentLevel, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { noDedicationLockVariant, readExport } from './pathbuilder-import';

const registry = new ContentRegistry();
registry.register(DEDICATION_FIXTURES);
registry.register(
  new ContentPackBuilder()
    .withId('core-rules')
    .withVariantRuleElements('no-dedication-lock', [], [{ key: 'RollOption', option: 'self:dedication-lock:off' }])
    .build(),
);
const lookup = registryLookup(registry);
const mordred = readExport(mordredExport);

function feat(name: string, level: number): ImportedFeat {
  const text = PathbuilderName.parse(name);
  return {
    name: text,
    choice: undefined,
    type: text,
    level: ContentLevel.parse(level),
    slot: undefined,
    slotted: true,
  };
}

function wanted(...feats: readonly ImportedFeat[]): string | undefined {
  return noDedicationLockVariant({ ...mordred, feats }, registry, lookup)?.definition.slug;
}

describe('the No Dedication Lock variant an import asks for', () => {
  test('is wanted when a dedication comes before the earlier one’s archetype feats', () => {
    expect(wanted(feat('medic-dedication', 1), feat('sentinel-dedication', 2))).toBe('variant-rule:no-dedication-lock');
  });

  test('is not wanted when two other feats of the first archetype come first', () => {
    expect(
      wanted(
        feat('medic-dedication', 1),
        feat('medic-basic', 2),
        feat('medic-advanced', 3),
        feat('sentinel-dedication', 4),
      ),
    ).toBeUndefined();
  });

  test('is not wanted for one dedication', () => {
    expect(wanted(feat('medic-dedication', 1), feat('power-attack', 2))).toBeUndefined();
  });
});
