import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA } from '@pioneer/rules/sdk';

import { kindDataReport } from './dry-run-report';
import { idOf, translate } from './testing/import-fixtures';
import {
  action,
  AID,
  contentEntry,
  entryOf,
  FRIGHTENED,
  GRABBED,
  IMMOBILIZED,
  OFF_GUARD,
  PRONE,
  RAISE_A_SHIELD,
  SHIELD_RAISED,
} from './testing/kind-fixtures';

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
    expect(entry?.kindData?.data).toMatchObject({
      implies: [idOf('condition:off-guard'), idOf('condition:immobilized')],
    });
    expect(translation.kindDataGaps).toEqual([]);
  });
});

describe('kindDataReport', () => {
  test('counts kind data by kind and gaps by reason and field', () => {
    const report = kindDataReport(translate([AID, FRIGHTENED, action({ actionType: { value: 'exploration' } })]));

    expect(report.kindData).toEqual([
      { kind: ContentKind.Action, count: 1 },
      { kind: ContentKind.Condition, count: 1 },
    ]);
    expect(report.kindDataGaps).toEqual([{ key: 'unmapped-value actionType.value', count: 1 }]);
  });
});
