import { cva } from 'class-variance-authority';

import { forcedOptionClasses } from '../control.variants';

/** In the page flow below the trigger, never an overlay: on a phone it pushes content down instead of covering it. */
export const pickerPanelClasses = cva('mt-2xs block border border-line-default bg-surface-overlay')();
export const pickerSearchClasses = cva('block border-b border-line-subtle p-xs')();
/** Scrolls both ways, so a wide table moves inside the panel and never the page. */
export const pickerScrollerClasses = cva('block max-h-picker overflow-auto')();
export const pickerGridClasses = cva('block w-full')();
/** Sticks to the top of the scroller, and scrolls sideways with the body. */
export const pickerHeaderRowClasses = cva(
  'sticky top-none z-sticky flex w-max min-w-full border-b border-line-default bg-surface-overlay',
)();
/** The rows' box: as tall as all the rows together, so the scroll bar is true; rows place themselves inside it. */
export const pickerBodyClasses = cva('relative block w-max min-w-full')();

const columnWidthClasses = {
  sm: 'w-column-sm',
  md: 'w-column-md',
  lg: 'w-column-lg',
} as const;

/** A body cell. The row's highlight and picked state are on its cells, which is where the grid puts them. */
export const pickerCellVariants = cva(
  [
    'block shrink-0 px-sm py-sm text-body text-start text-fg-default pointer-fine:py-xs',
    'aria-selected:bg-accent-subtle aria-selected:text-accent-fg highlighted:bg-surface-sunken',
    'aria-disabled:cursor-not-allowed aria-disabled:text-fg-subtle',
    forcedOptionClasses,
  ],
  { variants: { width: columnWidthClasses }, defaultVariants: { width: 'md' } },
);

/** A column header: quieter than a cell. Its sort button is the pressable part. */
export const pickerHeaderCellVariants = cva(
  'flex shrink-0 items-center px-sm py-xs text-label font-medium text-fg-muted',
  {
    variants: { width: columnWidthClasses },
    defaultVariants: { width: 'md' },
  },
);

/** Why a row can't be picked, under its first cell's content. */
export const pickerDisabledReasonClasses = cva('block text-caption text-fg-subtle')();
