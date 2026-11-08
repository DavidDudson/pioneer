import type { TableColumn } from '@pioneer/frontier/data';
import type { ContentId } from '@pioneer/rules/sdk';
import { ItemTableSchema } from '@pioneer/rules/ui';
import type { RowOrder } from '@pioneer/rules/ui';

/** One weapon an item can take the shape of. */
export interface ShapeRow {
  readonly value: ContentId;
  readonly label: string;
}

/** How the shape rows are searched and sorted. */
export const SHAPE_ORDER: RowOrder<ShapeRow> = {
  text: (row) => row.label,
  sortKey: { name: (row) => row.label },
};

/** The column of the shape picker: the weapon's name. */
export function shapeColumns(header: string): readonly TableColumn<ShapeRow>[] {
  return new ItemTableSchema<ShapeRow>()
    .addText({ id: 'name', header, value: (row) => row.label, width: 'md' })
    .build();
}

export const shapeValue = (row: ShapeRow): string => row.value;
export const shapeLabel = (row: ShapeRow): string => row.label;
