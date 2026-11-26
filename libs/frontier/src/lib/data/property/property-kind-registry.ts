import { inject, InjectionToken } from '@angular/core';
import type { Provider, Type } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { LocaleFormat } from '../../locale/locale-format';
import { FRONTIER_PROPERTY_KINDS } from './property-kinds';
import type { PropertyContext, PropertyKind } from './property.types';

export type PropertyKindMap = ReadonlyMap<string, PropertyKind>;

function kindMap(kinds: readonly PropertyKind[], base: PropertyKindMap): PropertyKindMap {
  const merged = new Map(base);

  for (const kind of kinds) {
    merged.set(kind.id, kind);
  }

  return merged;
}

/** Every kind by id. Frontier's four by default; `providePropertyKinds` adds more. */
export const PROPERTY_KINDS = new InjectionToken<PropertyKindMap>('PROPERTY_KINDS', {
  providedIn: 'root',
  factory: (): PropertyKindMap => kindMap(FRONTIER_PROPERTY_KINDS, new Map()),
});

/**
 * Adds kinds to the ones above, or replaces a kind of the same id (a `ui` library's `number` that links a rule).
 * Provide it where the tables that need them live.
 */
export function providePropertyKinds(...kinds: readonly PropertyKind[]): Provider {
  return {
    provide: PROPERTY_KINDS,
    useFactory: (): PropertyKindMap => {
      const parent = inject(PROPERTY_KINDS, { skipSelf: true, optional: true });

      return kindMap(kinds, parent ?? kindMap(FRONTIER_PROPERTY_KINDS, new Map()));
    },
  };
}

/** The kind with this id; an unknown id is a mistake in a property list, so it throws. */
export function findPropertyKind(kinds: PropertyKindMap, id: string): PropertyKind {
  const kind = kinds.get(id);

  if (kind === undefined) {
    throw new Error(`No property kind "${id}" is registered. Provide it with providePropertyKinds().`);
  }

  return kind;
}

/**
 * The component a table renders for entities whose columns all look alike (a name cell with an icon). Below a
 * property's own cell and its kind's, above plain text.
 */
export const ENTITY_CELL = new InjectionToken<Type<unknown> | undefined>('ENTITY_CELL', {
  providedIn: 'root',
  factory: (): undefined => undefined,
});

/** The viewer's locale as the kinds need it. Call in an injection context. */
export function injectPropertyContext(): PropertyContext {
  const format = inject(LocaleFormat);
  const i18n = inject(TranslocoService);

  return {
    compareText: (left, right) => format.compare(left, right),
    formatNumber: (value) => format.number(value),
    formatDate: (value) => value.toLocaleString(format.locale(), { dateStyle: 'medium' }),
    translate: (key) => i18n.translate(key),
  };
}
