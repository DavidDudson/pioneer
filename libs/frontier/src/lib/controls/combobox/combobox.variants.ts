import { cva } from 'class-variance-authority';

import { controlVariants, forcedOptionClasses } from '../control.variants';

export const comboboxInputClasses = controlVariants();
/** In the page flow below the input, never an overlay: on a phone it pushes content down instead of covering it. */
export const comboboxPopupClasses = cva(
  'mt-2xs block max-h-listbox overflow-auto border border-line-default bg-surface-overlay',
)();
export const comboboxListboxClasses = cva('relative block w-full')();
/** Placed by the virtualizer: absolute, offset with a runtime transform. */
export const comboboxOptionClasses = cva([
  'absolute start-none top-none block w-full cursor-pointer px-sm py-sm text-body aria-disabled:cursor-not-allowed aria-disabled:text-fg-subtle aria-selected:bg-accent-subtle aria-selected:text-accent-fg pointer-fine:py-xs highlighted:bg-surface-sunken',
  forcedOptionClasses,
])();
export const comboboxStatusClasses = cva('block px-sm py-sm')();
/** An option's description: its own line under the label, smaller and quieter. */
export const comboboxOptionDescriptionClasses = cva('block text-caption text-fg-subtle')();
/** An option's tags: a wrapping row of badges under the name. */
export const comboboxOptionTagsClasses = cva('mt-3xs flex flex-wrap gap-2xs')();
