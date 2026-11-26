import { ContentText, EntryTextField } from '@pioneer/rules/sdk';
import type { ContentId, EntryTexts, LocaleTexts, RichText } from '@pioneer/rules/sdk';
import { SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import type { ContentLocale } from '@pioneer/shared/kernel';
import { and, count, eq, max, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { contentEntries, contentEntryTexts, contentPacks } from './content.table';

type Reader = Pick<BunSQLDatabase, 'select'>;

/** A text row, as the entry field it holds. */
interface TextRow {
  readonly entryId: ContentId;
  readonly field: EntryTextField;
  readonly text: RichText | ContentText;
}

/** A text row's value, read as the entry field it is: a name is a string, a description rich text. */
function entryTexts(held: Map<ContentId, EntryTexts>, row: TextRow): void {
  const entry = held.get(row.entryId) ?? {};

  if (row.field === EntryTextField.Name) {
    held.set(row.entryId, { ...entry, name: ContentText.parse(row.text) });
  } else {
    // SAFETY: a description row holds the rich text the editor checked, so the field says which of the two it is.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
    held.set(row.entryId, { ...entry, description: row.text as RichText });
  }
}

/**
 * What the text in `locale` of the entries in `packs` was at last write: how many rows, the newest and the sum of their
 * times, so a manifest's validator changes when a translation is added, edited or removed (a row swapped for an older
 * one included), with no pack hash changing. Empty when there is none: the source locale's text is the entries' own,
 * and a locale nobody translated is served as the source.
 */
export async function textsVersion(reader: Reader, locale: ContentLocale, packs: SQL | undefined): Promise<string> {
  if (locale === SOURCE_CONTENT_LOCALE) {
    return '';
  }

  const [row] = await reader
    .select({
      rows: count(),
      newest: max(contentEntryTexts.updatedAt),
      moments: sql<string>`sum(extract(epoch from ${contentEntryTexts.updatedAt}))`,
    })
    .from(contentEntryTexts)
    .innerJoin(contentEntries, eq(contentEntries.id, contentEntryTexts.entryId))
    .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
    .where(and(eq(contentEntryTexts.locale, locale), packs));

  return row === undefined || row.rows === 0 ? '' : `${row.rows}@${row.newest}@${row.moments}`;
}

/** The text in `locale` of the entries in `packs`, for the bundles built in it. The source locale's is never read. */
export async function textsOf(reader: Reader, locale: ContentLocale, packs: SQL | undefined): Promise<LocaleTexts> {
  if (locale === SOURCE_CONTENT_LOCALE) {
    return { locale, entries: new Map() };
  }

  const rows = await reader
    .select({ entryId: contentEntryTexts.entryId, field: contentEntryTexts.field, text: contentEntryTexts.text })
    .from(contentEntryTexts)
    .innerJoin(contentEntries, eq(contentEntries.id, contentEntryTexts.entryId))
    .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
    .where(and(eq(contentEntryTexts.locale, locale), packs));

  const entries = new Map<ContentId, EntryTexts>();

  for (const row of rows) {
    entryTexts(entries, row);
  }

  return { locale, entries };
}
