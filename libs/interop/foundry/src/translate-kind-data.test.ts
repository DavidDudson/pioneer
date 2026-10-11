import { describe, expect, test } from 'bun:test';

import {
  ActionCost,
  ContentEntry,
  ContentKind,
  FrequencyPeriod,
  KIND_DATA,
  RuleElementKey,
  SourceKind,
} from '@pioneer/rules/sdk';

import { kindDataReport } from './dry-run-report';
import { KindDataGapReason } from './kind-data-gaps';
import { idOf, playerCore, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import type { ImportedEntry, ImportTranslation } from './translate-import';

const RAISE_A_SHIELD: DocumentFixture = {
  id: 'xjGwis0uaC2305pm',
  name: 'Raise a Shield',
  type: 'action',
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'defensive',
    selfEffect: {
      name: 'Effect: Raise a Shield',
      uuid: 'Compendium.pf2e.equipment-effects.Item.Effect: Raise a Shield',
    },
    description: { value: '<p><strong>Requirements</strong> You are wielding a shield.</p><hr /><p>You raise it.</p>' },
  },
};

const SHIELD_RAISED: DocumentFixture = { id: '2YRDYVnC1eljaXKK', name: 'Effect: Raise a Shield', type: 'effect' };

const AID: DocumentFixture = {
  id: 'HCl3pzVefiv9ZKQW',
  name: 'Aid',
  type: 'action',
  system: {
    actionType: { value: 'reaction' },
    actions: { value: null },
    category: 'interaction',
    frequency: { max: 1, per: 'PT1H' },
    description: {
      value:
        '<p><strong>Trigger</strong> An ally is about to use an action.</p>\n<p><strong>Requirements</strong> The ally is willing.</p>',
    },
  },
};

const GRABBED: DocumentFixture = {
  id: 'kWc1fhmv9LBiTuei',
  name: 'Grabbed',
  type: 'condition',
  system: {
    value: { isValued: false, value: null },
    group: null,
    overrides: [],
    duration: { expiry: null, unit: 'unlimited', value: 0 },
    references: { children: [], immunityFrom: [], overriddenBy: [], overrides: [] },
    rules: [
      { inMemoryOnly: true, key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Off-Guard' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.eIcWbB5o3pP6OIMe' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Prone', predicate: ['self:flying'] },
    ],
  },
};

function condition(id: string, name: string, system: object = {}): DocumentFixture {
  return { id, name, type: 'condition', system: { value: { isValued: false, value: null }, ...system } };
}

const OFF_GUARD = condition('AJh5ex99aV6VTggg', 'Off-Guard');
const IMMOBILIZED = condition('eIcWbB5o3pP6OIMe', 'Immobilized');
const PRONE = condition('j91X7x0XSomq8d60', 'Prone');
const BLINDED = condition('XgEqL1kFApUbl5Z2', 'Blinded', { group: 'senses', overrides: ['dazzled'] });
const DAZZLED = condition('TkIyaNPgTZFBCCuh', 'Dazzled', { group: 'senses' });
const FRIGHTENED = condition('TBSHQspnbcqxsmjL', 'Frightened', { value: { isValued: true, value: 1 } });

function action(system: object, name = 'Test Action'): DocumentFixture {
  return { id: 'tSTAcT10n0000000', name, type: 'action', system: { actionType: { value: 'action' }, ...system } };
}

function entryOf(translation: ImportTranslation, slug: string): ImportedEntry | undefined {
  return translation.entries.find(({ envelope }) => envelope.slug === slug);
}

function dataOf(documents: readonly DocumentFixture[], slug: string): unknown {
  return entryOf(translate(documents), slug)?.kindData?.data;
}

/** The entry as `ContentEntry` takes it, with a located source in place of the import's book-only one. */
function contentEntry(entry: ImportedEntry | undefined): unknown {
  return (
    entry?.kindData && {
      ...entry.envelope,
      kind: entry.kindData.kind,
      data: entry.kindData.data,
      sources: [{ kind: SourceKind.Book, book: playerCore, page: 1 }],
    }
  );
}

describe('translateKindData: one fixture per kind, translated and parsed', () => {
  test('an action parses against ActionData and as a ContentEntry', () => {
    const translation = translate([RAISE_A_SHIELD, SHIELD_RAISED]);
    const entry = entryOf(translation, 'raise-a-shield');

    expect(entry?.kindData?.kind).toBe(ContentKind.Action);
    expect(KIND_DATA[ContentKind.Action].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
    expect(translation.kindDataGaps).toEqual([]);
  });

  test('a condition parses against ConditionData and as a ContentEntry, implies matching its grants', () => {
    const translation = translate([GRABBED, OFF_GUARD, IMMOBILIZED, PRONE]);
    const entry = entryOf(translation, 'grabbed');

    expect(entry?.kindData?.kind).toBe(ContentKind.Condition);
    expect(KIND_DATA[ContentKind.Condition].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });

  test('a document of a type without a kind translator yet has no kind data and no gaps', () => {
    const translation = translate([SHIELD_RAISED]);

    expect(entryOf(translation, 'effect-raise-a-shield')?.kindData).toBeUndefined();
    expect(translation.kindDataGaps).toEqual([]);
  });
});

describe('translateKindData: action values', () => {
  test.each([
    ['action', 1, ActionCost.One],
    ['action', 2, ActionCost.Two],
    ['action', 3, ActionCost.Three],
    ['reaction', null, ActionCost.Reaction],
    ['free', null, ActionCost.Free],
  ])('%s %p costs %s', (type, count, cost) => {
    const trigger = { value: '<p><strong>Trigger</strong> Something happens.</p>' };
    const data = dataOf(
      [action({ actionType: { value: type }, actions: { value: count }, description: trigger })],
      'test-action',
    );

    expect(data).toMatchObject({ cost });
  });

  test('a passive ability costs nothing', () => {
    expect(dataOf([action({ actionType: { value: 'passive' }, actions: { value: null } })], 'test-action')).toEqual({});
  });

  test('an unknown action type or count is reported, not guessed', () => {
    const { kindDataGaps } = translate([action({ actionType: { value: 'exploration' } })]);
    const counted = translate([action({ actions: { value: 4 } })]);

    expect(kindDataGaps).toContainEqual(
      expect.objectContaining({
        reason: KindDataGapReason.UnmappedValue,
        field: 'actionType.value',
        raw: 'exploration',
      }),
    );
    expect(counted.kindDataGaps).toContainEqual(expect.objectContaining({ field: 'actions.value', raw: 4 }));
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
    expect(translation.kindDataGaps).toContainEqual(expect.objectContaining({ field: 'frequency.per', raw: 'PT8H' }));
  });

  test('category maps; null is none, an unknown one is reported', () => {
    expect(dataOf([action({ actions: { value: 1 }, category: 'offensive' })], 'test-action')).toMatchObject({
      category: 'offensive',
    });
    expect(dataOf([action({ actions: { value: 1 }, category: null })], 'test-action')).toEqual({
      cost: ActionCost.One,
    });
    expect(translate([action({ actions: { value: 1 }, category: 'social' })]).kindDataGaps).toContainEqual(
      expect.objectContaining({ field: 'category', raw: 'social' }),
    );
  });

  test('trigger and requirements in plain words become a paragraph of text', () => {
    expect(dataOf([AID], 'aid')).toEqual({
      cost: ActionCost.Reaction,
      category: 'interaction',
      trigger: [{ type: 'paragraph', content: [{ type: 'text', text: 'An ally is about to use an action.' }] }],
      requirements: [{ type: 'paragraph', content: [{ type: 'text', text: 'The ally is willing.' }] }],
      frequency: { max: 1, per: FrequencyPeriod.Hour },
    });
  });

  test('usage text with an enricher is left for rich text, and a reaction without its trigger has no data', () => {
    const description = {
      value: '<p><strong>Trigger</strong> An @UUID[Compendium.pf2e.conditionitems.Item.Off-Guard] foe moves.</p>',
    };
    const translation = translate([action({ actionType: { value: 'reaction' }, description })]);

    expect(entryOf(translation, 'test-action')?.kindData).toBeUndefined();
    expect(translation.kindDataGaps.map(({ reason, field }) => [reason, field])).toEqual([
      [KindDataGapReason.NeedsRichText, 'trigger'],
      [KindDataGapReason.InvalidData, 'trigger'],
    ]);
  });

  test('selfEffect resolves to the effect entry by compendium UUID, or is reported', () => {
    const effect = idOf('effect-raise-a-shield');

    expect(dataOf([RAISE_A_SHIELD, SHIELD_RAISED], 'raise-a-shield')).toMatchObject({ selfEffect: effect });
    expect(translate([RAISE_A_SHIELD]).kindDataGaps).toContainEqual(
      expect.objectContaining({
        reason: KindDataGapReason.UnresolvedReference,
        field: 'selfEffect',
        raw: 'Compendium.pf2e.equipment-effects.Item.Effect: Raise a Shield',
      }),
    );
  });

  test('a set system field with no place in the schema is reported; one left at its default is not', () => {
    const translation = translate([
      action({ actions: { value: 1 }, deathNote: true, subfeatures: { keyOptions: [] } }),
    ]);

    expect(translation.kindDataGaps).toEqual([
      { entry: idOf('test-action'), reason: KindDataGapReason.UnmappedField, field: 'deathNote', raw: true },
    ]);
  });
});

describe('translateKindData: condition values', () => {
  test('valued, and group when Foundry sets one', () => {
    expect(dataOf([FRIGHTENED], 'frightened')).toEqual({ valued: true, overrides: [], implies: [] });
    expect(dataOf([DAZZLED], 'dazzled')).toEqual({ valued: false, group: 'senses', overrides: [], implies: [] });
  });

  test('an unknown group is reported and left out', () => {
    const translation = translate([condition('qqqqqqqqqqqqqqqq', 'Odd', { group: 'moods' })]);

    expect(entryOf(translation, 'odd')?.kindData?.data).toEqual({ valued: false, overrides: [], implies: [] });
    expect(translation.kindDataGaps).toContainEqual(expect.objectContaining({ field: 'group', raw: 'moods' }));
  });

  test('overrides resolve condition slugs to ids, or are reported', () => {
    expect(dataOf([BLINDED, DAZZLED], 'blinded')).toMatchObject({ overrides: [idOf('dazzled')] });
    expect(translate([BLINDED]).kindDataGaps).toContainEqual(
      expect.objectContaining({ reason: KindDataGapReason.UnresolvedReference, field: 'overrides', raw: 'dazzled' }),
    );
  });

  test('implies is every unconditional GrantItem of a condition, by name or id; predicated grants are not implied', () => {
    const translation = translate([GRABBED, OFF_GUARD, IMMOBILIZED, PRONE]);
    const entry = entryOf(translation, 'grabbed');

    expect(entry?.kindData?.data).toMatchObject({ implies: [idOf('off-guard'), idOf('immobilized')] });
    expect(entry?.envelope.rules.filter(({ key }) => key === RuleElementKey.GrantItem)).toHaveLength(3);
  });

  test("a condition's instance state is not reported as unmapped", () => {
    expect(translate([GRABBED, OFF_GUARD, IMMOBILIZED, PRONE]).kindDataGaps).toEqual([]);
  });
});

describe('kindDataReport', () => {
  test('counts kind data by kind and gaps by reason and field', () => {
    const report = kindDataReport(translate([AID, FRIGHTENED, action({ actionType: { value: 'exploration' } })]));

    expect(report.kindData).toEqual([
      { kind: ContentKind.Action, count: 2 },
      { kind: ContentKind.Condition, count: 1 },
    ]);
    expect(report.kindDataGaps).toEqual([{ key: 'unmapped-value actionType.value', count: 1 }]);
  });
});

describe('translateRules: GrantItem', () => {
  test('a GrantItem whose UUID names no selected document stays untranslated, with its raw JSON', () => {
    const translation = translate([GRABBED, IMMOBILIZED, PRONE]);
    const raw = { inMemoryOnly: true, key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Off-Guard' };

    expect(translation.envelopes.untranslatedRules).toEqual([{ entry: idOf('grabbed'), key: 'GrantItem', raw }]);
    expect(entryOf(translation, 'grabbed')?.kindData?.data).toMatchObject({ implies: [idOf('immobilized')] });
  });
});
