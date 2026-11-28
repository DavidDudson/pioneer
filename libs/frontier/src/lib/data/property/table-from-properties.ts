import type { RowData } from '@tanstack/angular-table';

import { presentOptions, TableSchema } from '../table/table-schema';
import { PropertyCell } from './property-cell.component';
import { findPropertyKind } from './property-kind-registry';
import type { PropertyKindMap } from './property-kind-registry';
import type { PropertyContext, PropertyDescriptor } from './property.types';

/**
 * What `tableFromProperties` needs besides the properties: the registered kinds and the viewer's locale. In an
 * app pass `inject(PROPERTY_KINDS)` and `injectPropertyContext()`, so sorting agrees with the cells, which read
 * both from injection; the context reads the locale when it is called, so a locale switch needs no rebuild.
 */
export interface TableFromPropertiesOptions {
  readonly kinds: PropertyKindMap;
  readonly context: PropertyContext;
}

/** The property with this id; an id outside the list is a mistake in the caller's column list, so it throws. */
function findProperty<TRow>(properties: ReadonlyArray<PropertyDescriptor<TRow>>, id: string): PropertyDescriptor<TRow> {
  const property = properties.find((candidate) => candidate.id === id);

  if (property === undefined) {
    throw new Error(`No property "${id}" in the list. Known: ${properties.map((known) => known.id).join(', ')}.`);
  }

  return property;
}

/**
 * Builds the columns of an `fr-table` from a property list and the ids to show, in that order. Each column takes
 * its header (the label key), width, sortability, hiding and code from its property, and sorts by its kind.
 * Cells are `fr-property-cell`, so they render the way the property's own cell, its kind or `ENTITY_CELL` says. Sorting is on unless the
 * property sets `sortable: false`.
 *
 * Returns a `TableSchema`, so the existing `add…` steps chain on after it:
 *
 * ```ts
 * const columns = tableFromProperties(HERO_PROPERTIES, ['name', 'level'], options).addTag({ … }).build();
 * ```
 */
export function tableFromProperties<TRow extends RowData>(
  properties: ReadonlyArray<PropertyDescriptor<TRow>>,
  visibleIds: ReadonlyArray<string>,
  options: TableFromPropertiesOptions,
): TableSchema<TRow> {
  const schema = new TableSchema<TRow>();
  const seen = new Set<string>();

  for (const id of visibleIds) {
    if (seen.has(id)) {
      throw new Error(`Property "${id}" is listed twice.`);
    }

    seen.add(id);
    const property = findProperty(properties, id);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: the cell calls `value` with the row it was given, which is a `TRow`; `Inputs<PropertyCell<TRow>>` does not resolve for a generic `TRow`, so the cell is typed on `unknown`.
    const erased = property as PropertyDescriptor<unknown>;
    const kind = findPropertyKind(options.kinds, property.kind);

    schema.addComponent<PropertyCell<unknown>>({
      id: property.id,
      sortValue: (row) => kind.text(property.value(row), options.context),
      compare: (left, right) => kind.compare(property.value(left), property.value(right), options.context),
      component: PropertyCell<unknown>,
      inputs: (row) => ({ property: erased, entity: row }),
      ...presentOptions({ ...property, header: property.label }),
    });
  }

  return schema;
}
