import { Locale } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { localeRows, shownLocales } from './locale-picker-table';

const rows = localeRows((locale) => `English name of ${locale}`);

describe(shownLocales, () => {
  it('lists every locale when nothing is typed', () => {
    expect(shownLocales(rows, '  ', undefined)).toStrictEqual(rows);
  });

  it('matches the native or the English name, ignoring case', () => {
    expect(shownLocales(rows, 'ENGLISH NAME', undefined)).toStrictEqual(rows);
    expect(shownLocales(rows, 'english', undefined).map((row) => row.locale)).toContain(Locale.English);
  });

  it('is empty when nothing matches', () => {
    expect(shownLocales(rows, 'no such language', undefined)).toStrictEqual([]);
  });

  it('orders by the named column, descending when asked', () => {
    const ascending = shownLocales(rows, '', { column: 'englishName', descending: false });
    const descending = shownLocales(rows, '', { column: 'englishName', descending: true });
    expect(descending.map((row) => row.locale)).toStrictEqual(ascending.map((row) => row.locale).toReversed());
  });
});

describe(localeRows, () => {
  it('reads the native name from Intl and the coverage from the constant', () => {
    const [english] = rows;
    expect(english?.locale).toBe(Locale.English);
    expect(english?.nativeName).toBe('English');
    expect(english?.coverage).toBe(1);
  });
});
