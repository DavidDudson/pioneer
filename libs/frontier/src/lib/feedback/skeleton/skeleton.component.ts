import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { Stack } from '../../layout/stack/stack.component';

export const SkeletonKind = {
  Text: 'text',
  Block: 'block',
  Square: 'square',
  /** A row of an `fr-list-item` with media and two lines of content. */
  Item: 'item',
} as const;

export type SkeletonKind = ValueOf<typeof SkeletonKind>;

export const SkeletonWidth = { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Full: 'full' } as const;

export type SkeletonWidth = ValueOf<typeof SkeletonWidth>;

const skeletonVariants = cva('block', {
  variants: {
    kind: {
      text: 'h-lh animate-shimmer bg-surface-skeleton forced-colors:bg-system-gray-text',
      block: 'h-2xl animate-shimmer bg-surface-skeleton forced-colors:bg-system-gray-text',
      square: 'size-xl animate-shimmer bg-surface-skeleton forced-colors:bg-system-gray-text',
      item: 'flex items-center gap-sm',
    } satisfies Record<SkeletonKind, string>,
    width: {
      xs: 'w-xl',
      sm: 'w-3xl',
      md: 'w-placeholder-md',
      lg: 'w-placeholder-lg',
      full: 'w-full',
    } satisfies Record<SkeletonWidth, string>,
  },
});

/**
 * Placeholder shaped like content that is still loading. `kind="item"` is a whole `fr-list-item` row: media and two lines. Hidden from assistive tech. GrayText under forced
 * colours, where its fill would match the page.
 */
@Component({
  selector: 'fr-skeleton',
  imports: [Stack],
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
})
export class Skeleton {
  public readonly kind = input<SkeletonKind>(SkeletonKind.Text);
  public readonly width = input<SkeletonWidth>(SkeletonWidth.Md);

  protected readonly isItem = computed(() => this.kind() === SkeletonKind.Item);
  protected readonly classes = computed(() => {
    const kind = this.kind();

    return skeletonVariants(
      kind === SkeletonKind.Square || kind === SkeletonKind.Item ? { kind } : { kind, width: this.width() },
    );
  });
}
