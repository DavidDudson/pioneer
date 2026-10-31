import { tableSchema } from '@pioneer/frontier/data';
import type { TableColumn } from '@pioneer/frontier/data';
import type { BodyFont } from '@pioneer/shared/kernel';

/** One body font to pick, by the name shown for it. */
export interface BodyFontRow {
  readonly font: BodyFont;
  readonly name: string;
}

/** The one column of the font picker: the font's name. */
export function bodyFontColumns(header: string): readonly TableColumn<BodyFontRow>[] {
  return tableSchema<BodyFontRow>()
    .addText({ id: 'name', header, value: (row) => row.name, width: 'md' })
    .build();
}

/** What the picker stores for a row. */
export const bodyFontValue = (row: BodyFontRow): BodyFont => row.font;

/** What the picker shows for the picked row. */
export const bodyFontLabel = (row: BodyFontRow): string => row.name;
