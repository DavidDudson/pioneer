import type { TableColumn } from '@pioneer/frontier/data';
import type { ContentId } from '@pioneer/rules/sdk';
import { ItemTableSchema } from '@pioneer/rules/ui';
import type { RowOrder } from '@pioneer/rules/ui';

/** One weapon an item can take the shape of. */
export interface WeaponRow {
  readonly value: ContentId;
  readonly label: string;
}

/** How the shape rows are searched and sorted. */
export const WEAPON_ORDER: RowOrder<WeaponRow> = {
  text: (row) => row.label,
  sortKey: { name: (row) => row.label },
};

/** The column of the shape picker: the weapon's name. */
export function weaponColumns(header: string): ReadonlyArray<TableColumn<WeaponRow>> {
  return new ItemTableSchema<WeaponRow>()
    .addText({ id: 'name', header, value: (row) => row.label, width: 'md' })
    .build();
}

export const weaponValue = (row: WeaponRow): string => row.value;
export const weaponLabel = (row: WeaponRow): string => row.label;
