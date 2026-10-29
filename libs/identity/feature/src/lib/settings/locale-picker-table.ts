import { tableSchema } from '@pioneer/frontier/data';
import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { Locale } from '@pioneer/shared/kernel';

/** How much of the UI each locale translates, 0 to 1. The source locale is whole by definition. */
const LOCALE_COVERAGE = {
  [Locale.English]: 1,
} as const satisfies Record<Locale, number>;

/** One locale to pick: its name in itself, its name in English and how much of the UI is translated. */
export interface LocaleRow {
  readonly locale: Locale;
  readonly nativeName: string;
  readonly englishName: string;
  readonly coverage: number;
}

const PERCENT = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 });

/** Every locale as a row, the native name read by `Intl` so it needs no message of its own. */
export function localeRows(englishName: (locale: Locale) => string): readonly LocaleRow[] {
  return Object.values(Locale).map((locale) => ({
    locale,
    nativeName: new Intl.DisplayNames(locale, { type: 'language' }).of(locale) ?? locale,
    englishName: englishName(locale),
    coverage: LOCALE_COVERAGE[locale],
  }));
}

/** The locales whose names hold `query`, in the order asked for; the list is short, so the page holds it all. */
export function shownLocales(
  rows: readonly LocaleRow[],
  query: string,
  sort: PickerSort | undefined,
): readonly LocaleRow[] {
  const typed = query.trim().toLowerCase();
  const matching = rows.filter((row) => `${row.nativeName} ${row.englishName}`.toLowerCase().includes(typed));
  if (sort === undefined) {
    return matching;
  }
  const direction = sort.descending ? -1 : 1;
  return matching.toSorted((left, right) => direction * compare(left, right, sort.column));
}

function compare(left: LocaleRow, right: LocaleRow, column: string): number {
  if (column === 'coverage') {
    return left.coverage - right.coverage;
  }
  return column === 'englishName'
    ? left.englishName.localeCompare(right.englishName)
    : left.nativeName.localeCompare(right.nativeName);
}

/** The columns of a locale picker: native name, English name and translation coverage. */
export function localeColumns(headers: {
  readonly native: string;
  readonly english: string;
  readonly coverage: string;
}): readonly TableColumn<LocaleRow>[] {
  return tableSchema<LocaleRow>()
    .addText({ id: 'nativeName', header: headers.native, value: (row) => row.nativeName, width: 'md' })
    .addTag({ id: 'englishName', header: headers.english, value: (row) => ({ label: row.englishName }), width: 'md' })
    .addTag({
      id: 'coverage',
      header: headers.coverage,
      value: (row) => ({ label: PERCENT.format(row.coverage) }),
      width: 'sm',
    })
    .build();
}

/** What the picker stores for a row. */
export const localeValue = (row: LocaleRow): Locale => row.locale;

/** What the picker shows for the picked row. */
export const localeLabel = (row: LocaleRow): string => row.nativeName;
