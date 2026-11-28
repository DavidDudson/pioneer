import { cva } from 'class-variance-authority';

import { figureClasses } from '../tokens';

/**
 * Shared look for every value control, so they all match. 44px touch target
 * unless the pointer is fine; `text-body` (16px) so iOS doesn't zoom on focus.
 */
export const controlVariants = cva(
  [
    'block w-full border border-line-default bg-surface-base text-body text-fg-default',
    'placeholder:text-fg-subtle focus-visible:focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-disabled aria-invalid:border-danger-line',
  ],
  {
    variants: {
      numeric: { true: figureClasses, false: '' },
      /** A button that opens a popup (select trigger). */
      trigger: { true: 'flex items-center justify-between gap-xs text-start', false: '' },
      /** Several lines (text area): grows with `rows`, resizable in height only. */
      multiline: { true: 'resize-y py-xs', false: 'h-control-md' },
      /** Code-like text (JSON, formulas), where every character matters. */
      monospace: { true: 'font-mono', false: 'font-ui' },
      /** Room for an icon at each end (search icon, clear button), each a touch target wide. */
      adorned: {
        true: 'ps-control-md pe-control-md',
        false: 'px-sm',
      },
    },
    defaultVariants: { multiline: false, monospace: false, adorned: false },
  },
);

/**
 * The input inside an `fr-input-group`: no box of its own, since the group draws the border, focus ring and
 * status around it and its addons. Fills the room the addons leave.
 */
export const groupedControlVariants = cva(
  [
    'block h-control-md w-full min-w-none bg-transparent px-sm text-body text-fg-default',
    'placeholder:text-fg-subtle focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-disabled',
  ],
  {
    variants: {
      numeric: { true: figureClasses, false: '' },
      monospace: { true: 'font-mono', false: 'font-ui' },
    },
    defaultVariants: { monospace: false },
  },
);

/**
 * A touch-target-wide slot at one end of an `adorned` control, holding its icon or icon button.
 * The start slot is decorative, so presses pass through to the input.
 */
export const adornmentVariants = cva('absolute inset-y-none flex w-control-md items-center justify-center', {
  variants: {
    edge: {
      start: 'pointer-events-none start-none text-fg-subtle',
      end: 'end-none',
      /** A start slot that takes presses. */
      startAction: 'start-none',
    },
    /** Dims with the disabled control. */
    disabled: { true: 'opacity-disabled', false: '' },
  },
  defaultVariants: { disabled: false },
});

/**
 * A listbox option's states under forced colours, where their tinted fills vanish. The highlighted option (the
 * keyboard's) fills with Highlight, as native lists do; the selected one is underlined, so it stays marked when
 * the highlight moves off it.
 */
export const forcedOptionClasses = cva(
  'forced-colors:aria-selected:underline forced-colors:highlighted:bg-system-highlight forced-colors:highlighted:text-system-highlight-text',
)();
