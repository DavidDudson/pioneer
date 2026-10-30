import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { InventoryItemId, InventorySchema } from '@pioneer/character/domain';
import type { InventoryItem } from '@pioneer/character/domain';
import {
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  lineOf,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { frontierMessages } from '@pioneer/frontier';
import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { shownRows } from '../picker-rows';
import { propertyRuneEntries, runeKey } from './rune-options';
import { etchedRows, gradeRows, propertyRows, RUNE_ORDER, slotsOf } from './rune-picker';

const items = itemFixtureContent();
const content = { items, runes: runeFixtureContent() };
const SWORD = items.get(itemFixtureId(ItemFixture.Longsword));
const WORDS = { fundamental: 'Fundamental', property: 'Property' };
const FLAMING = runeFixtureId(RuneFixture.Flaming);
const SWORD_LINE = '11111111-1111-4111-8111-111111111111';
const LINE: InventoryItem = lineOf(
  InventorySchema.parse({
    items: [
      {
        id: SWORD_LINE,
        item: itemFixtureId(ItemFixture.Longsword),
        quantity: 1,
        runes: { potency: 1, property: [FLAMING] },
      },
    ],
    coins: {},
  }),
  InventoryItemId.parse(SWORD_LINE),
);

function i18n(): TranslocoService {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  return TestBed.inject(TranslocoService);
}

describe(gradeRows, () => {
  it('starts with none, then offers each grade that can be etched, all fundamental and using no slot', () => {
    const rows = gradeRows(
      content,
      { rune: FundamentalRune.Striking, entry: SWORD, none: { value: '', label: 'None' }, words: WORDS },
      i18n(),
    );

    expect(rows.map((row) => row.value)).toStrictEqual(['', '1', '2', '3', '4']);
    expect(new Set(rows.map((row) => row.kind))).toStrictEqual(new Set([WORDS.fundamental]));
    expect(new Set(rows.map((row) => row.slots))).toStrictEqual(new Set([0]));
    expect(rows[0]?.level).toBe(0);
  });
});

describe(propertyRows, () => {
  it('lists a property rune by the name its content gives, using one property slot', () => {
    const entries = propertyRuneEntries(content, { item: LINE, entry: SWORD }, (left, right) =>
      left.localeCompare(right),
    );
    const rows = propertyRows(entries, WORDS);

    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((row) => row.kind))).toStrictEqual(new Set([WORDS.property]));
    expect(new Set(rows.map((row) => row.slots))).toStrictEqual(new Set([1]));
    expect(shownRows(rows, { query: 'zzz', sort: undefined }, RUNE_ORDER)).toStrictEqual([]);
  });
});

describe(etchedRows, () => {
  it('names each etched rune by its key, a property rune taking a slot and a fundamental one none', () => {
    const runes = [
      { type: RuneType.Fundamental, rune: FundamentalRune.Potency },
      { type: RuneType.Property, rune: FLAMING },
    ] as const;
    const rows = etchedRows(content, { item: LINE, entry: SWORD, runes, key: runeKey }, { i18n: i18n(), words: WORDS });

    expect(rows.map((row) => [row.value, row.slots])).toStrictEqual([
      ['fundamental:potency', 0],
      [`property:${FLAMING}`, 1],
    ]);
  });
});

describe(slotsOf, () => {
  it('counts the property runes etched against the room its potency rune gives', () => {
    const { used, room } = slotsOf(LINE, SWORD);

    expect(used).toBe(1);
    expect(room).toBeGreaterThanOrEqual(1);
  });

  it('has none for an item that is not there', () => {
    expect(slotsOf(undefined, SWORD)).toStrictEqual({ used: 0, room: 0 });
  });
});
