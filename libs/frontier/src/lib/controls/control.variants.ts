import { cva } from 'class-variance-authority';

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
      numeric: { true: 'tabular-nums', false: '' },
      /** A button that opens a popup (select trigger). */
      trigger: { true: 'flex items-center justify-between gap-xs text-start', false: '' },
      /** Several lines (text area): grows with `rows`, resizable in height only. */
      multiline: { true: 'resize-y py-xs', false: 'h-touch pointer-fine:h-control-md' },
      /** Code-like text (JSON, formulas), where every character matters. */
      monospace: { true: 'font-mono', false: '' },
      /** Room for an icon at each end (search icon, clear button), each a touch target wide. */
      adorned: {
        true: 'ps-touch pe-touch pointer-fine:ps-control-md pointer-fine:pe-control-md',
        false: 'px-sm',
      },
    },
    defaultVariants: { multiline: false, monospace: false, adorned: false },
  },
);

/**
 * A touch-target-wide slot at one end of an `adorned` control, holding its icon or icon button.
 * The start slot is decorative, so presses pass through to the input.
 */
export const adornmentVariants = cva(
  'absolute inset-y-none flex w-touch items-center justify-center pointer-fine:w-control-md',
  {
    variants: {
      edge: { start: 'pointer-events-none start-none text-fg-subtle', end: 'end-none' },
      /** Dims with the disabled control. */
      disabled: { true: 'opacity-disabled', false: '' },
    },
    defaultVariants: { disabled: false },
  },
);
