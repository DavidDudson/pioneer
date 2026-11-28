import type { Type } from '@angular/core';

import type { PropertyDescriptor, PropertyKind } from './property.types';

/**
 * The component that renders a property's cell, in this order: the property's own, its kind's, the entity's
 * (`ENTITY_CELL`). `undefined` means none was given, and the cell is the kind's text.
 */
export function resolvePropertyCell(
  property: Pick<PropertyDescriptor<unknown>, 'cell'>,
  kind: Pick<PropertyKind, 'cell'>,
  entityCell: Type<unknown> | undefined,
): Type<unknown> | undefined {
  return property.cell ?? kind.cell ?? entityCell;
}
