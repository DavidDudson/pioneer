import { cva } from 'class-variance-authority';

import { controlVariants } from '../control.variants';

export const comboboxInputClasses = controlVariants();
/** In the page flow below the input, never an overlay: on a phone it pushes content down instead of covering it. */
export const comboboxPopupClasses = cva(
  'mt-2xs block max-h-listbox overflow-auto border border-line-default bg-surface-overlay',
)();
export const comboboxListboxClasses = cva('relative block w-full')();
/** Placed by the virtualizer: absolute, offset with a runtime transform. */
export const comboboxOptionClasses = cva(
  'absolute top-none start-none block w-full cursor-pointer px-sm py-sm text-body aria-selected:bg-accent-subtle aria-selected:text-accent-fg highlighted:bg-surface-sunken pointer-fine:py-xs',
)();
export const comboboxStatusClasses = cva('block px-sm py-sm')();
