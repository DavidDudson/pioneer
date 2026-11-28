import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva, cx } from 'class-variance-authority';

import type { Container } from '../../tokens';
import { paddingVariants, Space } from '../../tokens';

export const BoxWidth = { Full: 'full', Prose: 'prose', Page: 'page' } as const;

export type BoxWidth = ValueOf<typeof BoxWidth>;

const hostVariants = cva('@container min-w-none', {
  variants: {
    grow: { true: 'flex-1', false: '' },
    width: {
      full: 'w-full',
      prose: 'mx-auto w-full max-w-prose',
      page: 'mx-auto w-full max-w-page',
    } satisfies Record<BoxWidth, string>,
  },
});

/** `paddingVariants` on the inline axis alone, for content that lines up with a row's text but keeps its own height. */
const inlinePaddingVariants = {
  none: 'px-none',
  '3xs': 'px-3xs',
  '2xs': 'px-2xs',
  xs: 'px-xs',
  sm: 'px-sm',
  md: 'px-md',
  lg: 'px-lg',
  xl: 'px-xl',
  '2xl': 'px-2xl',
  '3xl': 'px-3xl',
} as const satisfies Record<Space, string>;

const innerVariants = cva('', {
  variants: {
    padding: paddingVariants,
    gutter: { true: 'px-md @lg:px-xl', false: '' },
  },
});

const inlineVariants = cva('', {
  variants: {
    padding: inlinePaddingVariants,
    gutter: { true: 'px-md @lg:px-xl', false: '' },
  },
});

/**
 * The host's `display`. A container query reads the nearest container above the element that carries it, so these sit
 * on the host (whose own container is the box) and read the region around the box, not the box's own width.
 */
const displayVariants = cva('', {
  variants: {
    shownFrom: {
      sm: 'hidden @sm:block',
      md: 'hidden @md:block',
      lg: 'hidden @lg:block',
    } satisfies Record<Container, string>,
    hiddenFrom: {
      sm: 'block @sm:hidden',
      md: 'block @md:hidden',
      lg: 'block @lg:hidden',
    } satisfies Record<Container, string>,
  },
});

/**
 * A region: query container, max width and padding. Wrap a region in a box
 * when what is inside should respond to the region's width. `gutter` adds
 * inline padding that widens with the box (md, then xl from the `lg`
 * container size).
 *
 * `shownFrom` shows the box only once the region around it is that wide and `hiddenFrom` hides it from that width up;
 * `revealed` keeps a `shownFrom` box visible in a narrower region (something the user pressed opened it).
 */
@Component({
  selector: 'fr-box',
  templateUrl: './box.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
})
export class Box {
  public readonly width = input<BoxWidth>(BoxWidth.Full);
  public readonly padding = input<Space>(Space.None);
  public readonly gutter = input(false, { transform: booleanAttribute });
  /** `padding` applies to the left and right only. */
  public readonly inline = input(false, { transform: booleanAttribute });

  /** Show the box only from this size of the container around it up. */
  public readonly shownFrom = input<Container | undefined>(undefined);
  /** Hide the box from this size of the container around it up. */
  public readonly hiddenFrom = input<Container | undefined>(undefined);
  /** Show a `shownFrom` box below its size too. */
  public readonly revealed = input(false, { transform: booleanAttribute });

  /** Take the remaining space when this box sits in a row (a container has no width of its own there). */
  public readonly grow = input(false, { transform: booleanAttribute });

  protected readonly hostClasses = computed(() => {
    const shownFrom = this.revealed() ? undefined : this.shownFrom();
    const hiddenFrom = this.hiddenFrom();

    const display =
      shownFrom === undefined && hiddenFrom === undefined ? 'block' : displayVariants({ shownFrom, hiddenFrom });

    return cx(display, hostVariants({ width: this.width(), grow: this.grow() }));
  });

  protected readonly classes = computed(() =>
    (this.inline() ? inlineVariants : innerVariants)({ padding: this.padding(), gutter: this.gutter() }),
  );
}
