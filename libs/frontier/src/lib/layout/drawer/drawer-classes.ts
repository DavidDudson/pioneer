import { cva } from 'class-variance-authority';

import { elevationVariants } from '../../tokens';
import type { DrawerWidth } from './drawer-width';

/**
 * Docked, the host's width runs between nothing and the drawer's width, so the page's content is pushed aside and
 * back; `display` is part of the transition, so the host stays in the page until it has closed. Opening takes the
 * enter pair and closing the exit pair. Below `lg` the drawer is a modal and none of this applies.
 */
export const hostVariants = cva('min-w-none @lg:overflow-clip @lg:transition-dock', {
  variants: {
    open: {
      true: 'block @lg:shrink-0 @lg:duration-enter @lg:ease-enter starting:@lg:w-none',
      false: 'hidden @lg:w-none @lg:duration-exit @lg:ease-exit',
    },
    // A modal drawer sits in the top layer, so its host takes no room in the page.
    overlay: { true: '', false: '' },
    width: {
      narrow: '',
      default: '',
      wide: '',
    } satisfies Record<DrawerWidth, string>,
  },
  compoundVariants: [
    { open: true, overlay: true, class: 'contents' },
    { open: true, width: 'narrow', class: '@lg:w-drawer-narrow' },
    { open: true, width: 'default', class: '@lg:w-drawer-default' },
    { open: true, width: 'wide', class: '@lg:w-drawer-wide' },
  ],
});

export const panelVariants = cva('flex gap-sm border-none text-fg-default', {
  variants: {
    overlay: {
      true: `fixed inset-none m-none size-full max-h-none max-w-none overflow-auto p-md backdrop:bg-surface-overlay ${elevationVariants.modal}`,
      // Docked, the panel keeps its own width while the host opens and closes, so the content is revealed, not reflowed.
      false: `static m-none w-full p-none transition-fade-width ${elevationVariants.overlay}`,
    },
    width: {
      narrow: '',
      default: '',
      wide: '',
    } satisfies Record<DrawerWidth, string>,
  },
  compoundVariants: [
    { overlay: false, width: 'narrow', class: '@lg:w-drawer-narrow' },
    { overlay: false, width: 'default', class: '@lg:w-drawer-default' },
    { overlay: false, width: 'wide', class: '@lg:w-drawer-wide' },
  ],
});

/** Applied while the docked panel leaves: it fades on the exit pair. The modal one leaves at once, so focus can return. */
export const dockedLeaveClasses = 'fade-out';
