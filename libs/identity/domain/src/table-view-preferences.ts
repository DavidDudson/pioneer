import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { UserId } from './identity-fields';

/** A table's entity key is a short slug (`characters`, `content-browser`): the page names it, never the user. */
export const TABLE_ENTITY_MAX_LENGTH = 64;

export const TableEntity = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/u)
  .max(TABLE_ENTITY_MAX_LENGTH)
  .brand<'TableEntity'>();

export type TableEntity = z.infer<typeof TableEntity>;

/** A column's id as the table schema declares it. */
export const TABLE_COLUMN_ID_MAX_LENGTH = 64;

export const TableColumnId = z.string().min(1).max(TABLE_COLUMN_ID_MAX_LENGTH).brand<'TableColumnId'>();

export type TableColumnId = z.infer<typeof TableColumnId>;

/** The most columns one view can list; a table has far fewer. */
export const TABLE_VIEW_COLUMNS_MAX = 64;

/** The most saved views one user keeps per table. */
export const SAVED_VIEWS_MAX = 20;

const SAVED_VIEW_NAME_MAX_LENGTH = 60;

export const SavedViewName = z.string().trim().min(1).max(SAVED_VIEW_NAME_MAX_LENGTH).brand<'SavedViewName'>();

export type SavedViewName = z.infer<typeof SavedViewName>;

/** Row spacing of a table. */
export const TableDensity = {
  Compact: 'compact',
  Comfortable: 'comfortable',
} as const;

export type TableDensity = ValueOf<typeof TableDensity>;

export const TableDensitySchema = z.enum(TableDensity);

/** The part of a view that is a choice of layout: which columns show, in what order, how dense. */
const ViewLayout = {
  /** The visible column ids, in display order. Absent is the descriptor's default columns. */
  columns: z
    .array(TableColumnId)
    .max(TABLE_VIEW_COLUMNS_MAX)
    .refine((ids) => new Set(ids).size === ids.length)
    .optional(),
  density: TableDensitySchema.optional(),
};

export const SavedView = z.strictObject({ name: SavedViewName, ...ViewLayout });

export type SavedView = z.output<typeof SavedView>;

/**
 * One user's preferences for one table. A field is absent until chosen, and absent falls through to the
 * descriptor's default. Saved views are kept by name, at most `SAVED_VIEWS_MAX`.
 */
export const TableViewPreferences = z.strictObject({
  ...ViewLayout,
  savedViews: z
    .array(SavedView)
    .max(SAVED_VIEWS_MAX)
    .refine((views) => new Set(views.map((view) => view.name)).size === views.length)
    .optional(),
});

export type TableViewPreferences = z.output<typeof TableViewPreferences>;

/** Nothing chosen yet: what a table starts with. */
export const NO_TABLE_VIEW_PREFERENCES: TableViewPreferences = {};

/** Whose preference, for which table. */
export interface TableViewTarget {
  readonly userId: UserId;
  readonly entity: TableEntity;
}
