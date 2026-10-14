import { describe, expect, test } from 'bun:test';

import { ActionCost, FrequencyPeriod } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { idOf, translate } from './testing/import-fixtures';
import {
  action,
  AID,
  dataOf,
  entryOf,
  FOUNDRY_NULL,
  gapsOf,
  OFF_GUARD,
  RAISE_A_SHIELD,
  SHIELD_RAISED,
} from './testing/kind-fixtures';

describe('translateKindData: action values', () => {
  test.each([
    ['action', 1, ActionCost.One],
    ['action', 2, ActionCost.Two],
    ['action', 3, ActionCost.Three],
    ['reaction', FOUNDRY_NULL, ActionCost.Reaction],
    ['free', FOUNDRY_NULL, ActionCost.Free],
  ])('%s %p costs %s', (type, count, cost) => {
    const trigger = { value: '<p><strong>Trigger</strong> Something happens.</p>' };
    const data = dataOf(
      [action({ actionType: { value: type }, actions: { value: count }, description: trigger })],
      'test-action',
    );

    expect(data).toMatchObject({ cost });
  });

  test('a passive ability costs nothing', () => {
    expect(
      dataOf([action({ actionType: { value: 'passive' }, actions: { value: FOUNDRY_NULL } })], 'test-action'),
    ).toEqual({});
  });

  test.each([
    {
      what: 'an unknown action type',
      system: { actionType: { value: 'exploration' } },
      field: 'actionType.value',
      raw: 'exploration',
    },
    { what: 'a count above three', system: { actions: { value: 4 } }, field: 'actions.value', raw: 4 },
    {
      what: 'an action with no count',
      system: { actions: { value: FOUNDRY_NULL } },
      field: 'actions.value',
      raw: FOUNDRY_NULL,
    },
  ])('$what is reported, and the action has no data rather than reading as passive', ({ system, field, raw }) => {
    const translation = translate([action(system)]);

    expect(gapsOf(translation)).toEqual([{ reason: KindDataGapReason.UnmappedValue, field, raw }]);
    expect(entryOf(translation, 'test-action')?.kindData).toBeUndefined();
  });

  test('a frequency whose max is not a count of uses is reported and left out', () => {
    const translation = translate([action({ actions: { value: 1 }, frequency: { max: 0, per: 'turn' } })]);

    expect(entryOf(translation, 'test-action')?.kindData?.data).toEqual({ cost: ActionCost.One });
    expect(gapsOf(translation)).toEqual([{ reason: KindDataGapReason.UnmappedValue, field: 'frequency.max', raw: 0 }]);
  });

  test("a system not shaped as an action's is reported as invalid data", () => {
    const translation = translate([{ id: 'tSTAcT10n0000000', name: 'Test Action', type: 'action' }]);

    expect(entryOf(translation, 'test-action')?.kindData).toBeUndefined();
    expect(translation.kindDataGaps.map(({ reason, field }) => [reason, field])).toEqual([
      [KindDataGapReason.InvalidData, ''],
    ]);
  });

  test.each([
    ['turn', FrequencyPeriod.Turn],
    ['round', FrequencyPeriod.Round],
    ['PT1M', FrequencyPeriod.Minute],
    ['PT10M', FrequencyPeriod.TenMinutes],
    ['PT1H', FrequencyPeriod.Hour],
    ['PT24H', FrequencyPeriod.TwentyFourHours],
    ['day', FrequencyPeriod.Day],
    ['P1W', FrequencyPeriod.Week],
    ['P1M', FrequencyPeriod.Month],
    ['P1Y', FrequencyPeriod.Year],
  ])('frequency per %s is %s', (per, period) => {
    const data = dataOf([action({ actions: { value: 1 }, frequency: { max: 2, per } })], 'test-action');

    expect(data).toMatchObject({ frequency: { max: 2, per: period } });
  });

  test('an unknown frequency period is reported and left out', () => {
    const translation = translate([action({ actions: { value: 1 }, frequency: { max: 1, per: 'PT8H' } })]);

    expect(entryOf(translation, 'test-action')?.kindData?.data).toEqual({ cost: ActionCost.One });
    expect(gapsOf(translation)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'frequency.per',
      raw: 'PT8H',
    });
  });

  test('category maps; FOUNDRY_NULL is none, an unknown one is reported', () => {
    expect(dataOf([action({ actions: { value: 1 }, category: 'offensive' })], 'test-action')).toMatchObject({
      category: 'offensive',
    });
    expect(dataOf([action({ actions: { value: 1 }, category: FOUNDRY_NULL })], 'test-action')).toEqual({
      cost: ActionCost.One,
    });
    const social = translate([action({ actions: { value: 1 }, category: 'social' })]);

    expect(gapsOf(social)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'category',
      raw: 'social',
    });
  });

  test('trigger and requirements in plain words become a paragraph of text', () => {
    expect(dataOf([AID], 'aid')).toEqual({
      cost: ActionCost.Reaction,
      category: 'interaction',
      trigger: [{ type: 'paragraph', content: [{ type: 'text', text: 'An ally is about to use an action.' }] }],
      requirementsText: [{ type: 'paragraph', content: [{ type: 'text', text: 'The ally is willing.' }] }],
      frequency: { max: 1, per: FrequencyPeriod.Hour },
    });
  });

  test('a link in the trigger becomes a ref to the entry it names', () => {
    const description = {
      value: '<p><strong>Trigger</strong> An @UUID[Compendium.pf2e.conditionitems.Item.Off-Guard] foe moves.</p>',
    };
    const documents = [action({ actionType: { value: 'reaction' }, description }), OFF_GUARD];

    expect(dataOf(documents, 'test-action')).toEqual({
      cost: ActionCost.Reaction,
      trigger: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'An ' },
            { type: 'ref', id: idOf('condition:off-guard') },
            { type: 'text', text: ' foe moves.' },
          ],
        },
      ],
    });
    expect(gapsOf(translate(documents))).toEqual([]);
  });

  test('requirements keep an inline check, and a link outside the import reads as its label', () => {
    const description = {
      value:
        '<p><strong>Requirements</strong> You hold @UUID[Compendium.pf2e.equipment-srd.Item.Thieves Toolkit]{thieves’ tools} and pass a @Check[thievery|dc:15].</p>',
    };

    expect(dataOf([action({ actions: { value: 1 }, description })], 'test-action')).toEqual({
      cost: ActionCost.One,
      requirementsText: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'You hold thieves’ tools and pass a ' },
            { type: 'check', statistic: 'skill:thievery', dc: 15 },
            { type: 'text', text: '.' },
          ],
        },
      ],
    });
  });

  test('a reaction without a trigger paragraph has no data', () => {
    const translation = translate([action({ actionType: { value: 'reaction' } })]);

    expect(entryOf(translation, 'test-action')?.kindData).toBeUndefined();
    expect(gapsOf(translation).map(({ reason, field }) => [reason, field])).toEqual([
      [KindDataGapReason.InvalidData, 'trigger'],
    ]);
  });

  test('selfEffect resolves to the effect entry by compendium UUID, or is reported', () => {
    const effect = idOf('effect:effect-raise-a-shield');

    expect(dataOf([RAISE_A_SHIELD, SHIELD_RAISED], 'raise-a-shield')).toMatchObject({ selfEffect: effect });
    expect(gapsOf(translate([RAISE_A_SHIELD]))).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'selfEffect',
      raw: 'Compendium.pf2e.equipment-effects.Item.Effect: Raise a Shield',
    });
  });

  test('a set system field with no place in the schema is reported; one left at its default is not', () => {
    const translation = translate([
      action({ actions: { value: 1 }, deathNote: true, subfeatures: { keyOptions: [] } }),
    ]);

    expect(translation.kindDataGaps).toEqual([
      { entry: idOf('action:test-action'), reason: KindDataGapReason.UnmappedField, field: 'deathNote', raw: true },
    ]);
  });
});
