import { cva } from 'class-variance-authority';

/**
 * Shared look for every value control, so they all match. 44px touch target
 * unless the pointer is fine; `text-body` (16px) so iOS doesn't zoom on focus.
 */
export const controlVariants = cva(
  [
    'block h-touch w-full border border-line-default bg-surface-base px-sm text-body text-fg-default',
    'placeholder:text-fg-subtle focus-visible:focus-ring pointer-fine:h-control-md',
    'disabled:cursor-not-allowed disabled:opacity-disabled aria-invalid:border-danger-line',
  ],
  {
    variants: {
      numeric: { true: 'tabular-nums', false: '' },
      /** A button that opens a popup (select trigger). */
      trigger: { true: 'flex items-center justify-between gap-xs text-start', false: '' },
    },
  },
);
