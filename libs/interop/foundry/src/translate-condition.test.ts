import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { idOf, translate } from './testing/import-fixtures';
import {
  BLINDED,
  condition,
  DAZZLED,
  dataOf,
  entryOf,
  FRIGHTENED,
  gapsOf,
  GRABBED,
  IMMOBILIZED,
  OFF_GUARD,
  PRONE,
} from './testing/kind-fixtures';

describe('translateKindData: condition values', () => {
  test('valued, and group when Foundry sets one', () => {
    expect(dataOf([FRIGHTENED], 'frightened')).toEqual({ valued: true, overrides: [], implies: [], recovery: {} });
    expect(dataOf([DAZZLED], 'dazzled')).toEqual({
      valued: false,
      group: 'senses',
      overrides: [],
      implies: [],
      recovery: {},
    });
  });

  test("a system not shaped as a condition's is reported as invalid data", () => {
    const translation = translate([{ id: 'qqqqqqqqqqqqqqqq', name: 'Odd', type: 'condition' }]);

    expect(entryOf(translation, 'odd')?.kindData).toBeUndefined();
    expect(translation.kindDataGaps.map(({ reason, field }) => [reason, field])).toEqual([
      [KindDataGapReason.InvalidData, ''],
    ]);
  });

  test('an unknown group is reported and left out', () => {
    const translation = translate([condition('qqqqqqqqqqqqqqqq', 'Odd', { group: 'moods' })]);

    expect(entryOf(translation, 'odd')?.kindData?.data).toEqual({
      valued: false,
      overrides: [],
      implies: [],
      recovery: {},
    });
    expect(gapsOf(translation)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'group',
      raw: 'moods',
    });
  });

  test('overrides resolve condition slugs to ids, or are reported', () => {
    expect(dataOf([BLINDED, DAZZLED], 'blinded')).toMatchObject({ overrides: [idOf('condition:dazzled')] });
    expect(gapsOf(translate([BLINDED]))).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'overrides',
      raw: 'dazzled',
    });
  });

  test('implies is every unconditional GrantItem of a condition, by name or id; predicated grants are not implied', () => {
    const translation = translate([GRABBED, OFF_GUARD, IMMOBILIZED, PRONE]);
    const entry = entryOf(translation, 'grabbed');

    expect(entry?.kindData?.data).toMatchObject({
      implies: [idOf('condition:off-guard'), idOf('condition:immobilized')],
    });
    expect(entry?.envelope.rules.filter(({ key }) => key === RuleElementKey.GrantItem)).toHaveLength(3);
  });

  test("a condition's instance state is not reported as unmapped", () => {
    expect(translate([GRABBED, OFF_GUARD, IMMOBILIZED, PRONE]).kindDataGaps).toEqual([]);
  });
});

describe('translateRules: GrantItem', () => {
  test('a GrantItem whose UUID names no selected document stays untranslated, with its raw JSON', () => {
    const translation = translate([GRABBED, IMMOBILIZED, PRONE]);
    const raw = { inMemoryOnly: true, key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Off-Guard' };

    expect(translation.envelopes.untranslatedRules).toEqual([
      { entry: idOf('condition:grabbed'), key: 'GrantItem', raw },
    ]);
    expect(entryOf(translation, 'grabbed')?.kindData?.data).toMatchObject({ implies: [idOf('condition:immobilized')] });
  });
});

describe('translateRules: GrantItem delete actions', () => {
  const UNCONSCIOUS = condition('fBnFDH2MTzgFijKf', 'Unconscious', {
    rules: [
      {
        key: 'GrantItem',
        onDeleteActions: { grantee: 'restrict' },
        uuid: 'Compendium.pf2e.conditionitems.Item.Blinded',
      },
      {
        key: 'GrantItem',
        onDeleteActions: { grantee: 'restrict', granter: 'detach' },
        uuid: 'Compendium.pf2e.conditionitems.Item.Prone',
      },
    ],
  });
  const DYING = condition('yZRUzMqrMmfLu0V1', 'Dying', {
    value: { isValued: true, value: 1 },
    rules: [
      {
        key: 'GrantItem',
        onDeleteActions: { grantee: 'restrict' },
        uuid: 'Compendium.pf2e.conditionitems.Item.Unconscious',
      },
    ],
  });
  const BLINDED_PLAIN = condition('XgEqL1kFApUbl5Z2', 'Blinded');

  test('a grant that goes with its granter and cannot be removed alone is derived, so it is implied', () => {
    const translation = translate([DYING, UNCONSCIOUS, BLINDED_PLAIN, PRONE]);

    expect(dataOf([DYING, UNCONSCIOUS, BLINDED_PLAIN, PRONE], 'dying')).toMatchObject({
      implies: [idOf('condition:unconscious')],
    });
    expect(entryOf(translation, 'unconscious')?.kindData?.data).toMatchObject({
      implies: [idOf('condition:blinded')],
    });
  });

  test('a grant whose grantee stays when its granter goes (Prone after Unconscious) is kept for the backlog', () => {
    const translation = translate([UNCONSCIOUS, BLINDED_PLAIN, PRONE]);

    expect(translation.envelopes.untranslatedRules.map(({ entry, key }) => [entry, key])).toEqual([
      [idOf('condition:unconscious'), 'GrantItem'],
    ]);
  });
});
