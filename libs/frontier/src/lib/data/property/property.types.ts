import type { Type } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { FilterOperator } from '../../controls/filter-bar/filter-bar.types';
import type { DateValue } from '../../date/date.component';
import type { Size } from '../../tokens';

/** The kinds frontier ships. A `ui` library registers its own under other ids (`providePropertyKinds`). */
export const PropertyKindId = {
  Text: 'text',
  Number: 'number',
  Bool: 'bool',
  Date: 'date',
} as const;

export type PropertyKindId = ValueOf<typeof PropertyKindId>;

/** Which edge a kind's values sit against: numbers line up on the end. */
export const PropertyAlign = { Start: 'start', End: 'end' } as const;

export type PropertyAlign = ValueOf<typeof PropertyAlign>;

/**
 * What a kind needs from the viewer's locale. Kinds are plain data that take it as an argument, so they run (and
 * are tested) without Angular.
 */
export interface PropertyContext {
  /** Compares two strings by the active locale. */
  readonly compareText: (left: string, right: string) => number;
  readonly formatNumber: (value: number) => string;
  readonly formatDate: (value: DateValue) => string;
  /** Translates a message key. */
  readonly translate: (key: string) => string;
}

/**
 * How one kind of value behaves wherever a property appears: shown, sorted, read aloud, filtered and edited. The
 * registry holds one per id, so a table, a column chooser and a filter bar all agree on what a `number` is.
 *
 * The members are methods, not properties, so a `PropertyKind<number>` is a `PropertyKind<unknown>` and the
 * registry can hold them together.
 */
export interface PropertyKind<TValue = unknown> {
  readonly id: string;
  readonly align: PropertyAlign;
  /** The filter operators a property of this kind offers, the default first. */
  readonly operators: readonly FilterOperator[];
  /** The component that renders a value of this kind. Without one the cell is `text`. */
  readonly cell?: Type<unknown>;
  /** The component that edits a value of this kind. */
  readonly editor?: Type<unknown>;
  // oxlint-disable-next-line typescript/method-signature-style -- method bivariance is what lets a PropertyKind<number> sit in a registry of PropertyKind<unknown>
  compare(left: TValue, right: TValue, context: PropertyContext): number;
  // oxlint-disable-next-line typescript/method-signature-style -- same: bivariance keeps the registry's one map type
  text(value: TValue, context: PropertyContext): string;
}

/**
 * One column-sized fact about an entity: where its value comes from and which kind it is. An entity type exposes a
 * list of these and tables, column choosers and filters are derived from it, so a new property is one entry.
 */
export interface PropertyDescriptor<TEntity, TValue = unknown> {
  readonly id: string;
  /** A message key, translated where the property is shown; a list of descriptors holds no copy. */
  readonly label: string;
  /** The id of a registered `PropertyKind`. */
  readonly kind: string;
  readonly value: (entity: TEntity) => TValue;
  /** Renders this property's value, ahead of its kind's cell and the entity's cell. */
  readonly cell?: Type<unknown>;
  /** The same options as a table column (`ColumnOptions`). */
  readonly width?: Size;
  readonly sortable?: boolean;
  readonly hideable?: boolean;
  readonly defaultHidden?: boolean;
  readonly code?: string;
}

/** The inputs a cell component can declare: the property's value, and the entity it belongs to. */
export interface PropertyCellInputs<TEntity, TValue = unknown> {
  readonly value: TValue;
  readonly entity: TEntity;
}
