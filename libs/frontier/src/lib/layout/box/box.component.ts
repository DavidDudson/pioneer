import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { paddingVariants, Space } from '../../tokens';

export const BoxWidth = { Full: 'full', Prose: 'prose', Page: 'page' } as const;
export type BoxWidth = ValueOf<typeof BoxWidth>;

const hostVariants = cva('@container block min-w-none', {
  variants: {
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
 * A region: query container, max width and padding. Wrap a region in a box
 * when what is inside should respond to the region's width. `gutter` adds
 * inline padding that widens with the box (md, then xl from the `lg`
 * container size).
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

  protected readonly hostClasses = computed(() => hostVariants({ width: this.width() }));
  protected readonly classes = computed(() =>
    (this.inline() ? inlineVariants : innerVariants)({ padding: this.padding(), gutter: this.gutter() }),
  );
}
