import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva, cx } from 'class-variance-authority';

import type { Container } from '../../tokens';
import { paddingVariants, Space } from '../../tokens';

export const BoxWidth = { Full: 'full', Prose: 'prose', Page: 'page' } as const;

export type BoxWidth = ValueOf<typeof BoxWidth>;

const hostVariants = cva('@container block min-w-none', {
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

/** Hidden until the box is this wide (`shownFrom`), or hidden from that width up (`hiddenFrom`). */
const visibilityVariants = cva('', {
  variants: {
    shownFrom: {
      sm: 'hidden @sm:block',
      md: 'hidden @md:block',
      lg: 'hidden @lg:block',
    } satisfies Record<Container, string>,
    hiddenFrom: {
      sm: '@sm:hidden',
      md: '@md:hidden',
      lg: '@lg:hidden',
    } satisfies Record<Container, string>,
  },
});

/**
 * A region: query container, max width and padding. Wrap a region in a box
 * when what is inside should respond to the region's width. `gutter` adds
 * inline padding that widens with the box (md, then xl from the `lg`
 * container size).
 *
 * `shownFrom` shows the content only once the box is that wide and `hiddenFrom` hides it from that width up;
 * `revealed` keeps `shownFrom` content visible in a narrower box (something the user pressed opened it).
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

  /** Show the content only from this container size up. */
  public readonly shownFrom = input<Container | undefined>(undefined);
  /** Hide the content from this container size up. */
  public readonly hiddenFrom = input<Container | undefined>(undefined);
  /** Show `shownFrom` content below its size too. */
  public readonly revealed = input(false, { transform: booleanAttribute });

  /** Take the remaining space when this box sits in a row (a container has no width of its own there). */
  public readonly grow = input(false, { transform: booleanAttribute });

  protected readonly hostClasses = computed(() => hostVariants({ width: this.width(), grow: this.grow() }));
  protected readonly classes = computed(() =>
    cx(
      (this.inline() ? inlineVariants : innerVariants)({ padding: this.padding(), gutter: this.gutter() }),
      visibilityVariants({
        shownFrom: this.revealed() ? undefined : this.shownFrom(),
        hiddenFrom: this.hiddenFrom(),
      }),
    ),
  );
}
