import { cva } from 'class-variance-authority';

import { elevationVariants } from '../../tokens';
import type { DrawerWidth } from './drawer-width';
import { WIDTHS } from './drawer-width';

const WIDTH_CLASSES: Readonly<Record<DrawerWidth, string>> = {
  narrow: '@lg:w-drawer-narrow',
  default: '@lg:w-drawer-default',
  wide: '@lg:w-drawer-wide',
};

const WIDTH_KEYS = WIDTHS;

/** `display` is in the transition, so the docked host stays in the page until it has closed. */
export const hostVariants = cva('min-w-none @lg:transition-dock', {
  variants: {
    open: {
      true: 'block @lg:shrink-0 @lg:duration-enter @lg:ease-enter starting:@lg:w-none',
      false: 'hidden @lg:w-none @lg:duration-exit @lg:ease-exit',
    },
    // A modal drawer sits in the top layer, so its host takes no room in the page.
    overlay: { true: '', false: '' },
    width: { narrow: '', default: '', wide: '' } satisfies Record<DrawerWidth, string>,
  },
  compoundVariants: [
    { open: true, overlay: true, class: 'contents' },
    ...WIDTH_KEYS.map((width) => ({ open: true, width, class: WIDTH_CLASSES[width] })),
  ],
});

export const panelVariants = cva('flex gap-sm border-none text-fg-default', {
  variants: {
    overlay: {
      true: `fixed inset-none m-none size-full max-h-none max-w-none overflow-auto p-md backdrop:bg-surface-overlay ${elevationVariants.modal}`,
      // Docked, the panel keeps its own width while the host opens and closes, so the content is revealed, not reflowed.
      false: `static m-none w-full p-none transition-fade-width ${elevationVariants.overlay}`,
    },
    width: { narrow: '', default: '', wide: '' } satisfies Record<DrawerWidth, string>,
  },
  compoundVariants: WIDTH_KEYS.map((width) => ({ overlay: false, width, class: WIDTH_CLASSES[width] })),
});
