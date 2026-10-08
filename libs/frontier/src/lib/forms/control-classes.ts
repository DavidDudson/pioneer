/** Shared look for text-like inputs, so every control matches. 44px touch target unless the pointer is fine. */
export const CONTROL_CLASSES = [
  'block h-[2.75rem] pointer-fine:h-[2.5rem] w-full rounded-control border border-line-default bg-surface-base px-sm text-body text-fg-default',
  'placeholder:text-fg-subtle focus-visible:focus-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-danger-line',
].join(' ');
