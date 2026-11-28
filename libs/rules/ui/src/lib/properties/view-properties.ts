import type { PropertyDescriptor } from '@pioneer/frontier/data';

/**
 * The same properties read from another row: `select` finds the entity a row holds, so a table of another kind of
 * row shows them without a second list. Only the value is adapted; a cell that reads the whole entity gets the
 * row, so it must ask for no more than the row has.
 */
export function viewProperties<TEntity, TRow>(
  properties: ReadonlyArray<PropertyDescriptor<TEntity>>,
  select: (row: TRow) => TEntity,
): ReadonlyArray<PropertyDescriptor<TRow>> {
  return properties.map((property): PropertyDescriptor<TRow> => ({
    ...property,
    value: (row) => property.value(select(row)),
  }));
}
