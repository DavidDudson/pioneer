import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

export const SkeletonKind = { Text: 'text', Block: 'block', Square: 'square' } as const;

export type SkeletonKind = ValueOf<typeof SkeletonKind>;

export const SkeletonWidth = { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Full: 'full' } as const;

export type SkeletonWidth = ValueOf<typeof SkeletonWidth>;

const skeletonVariants = cva('block animate-shimmer bg-surface-skeleton forced-colors:bg-system-gray-text', {
  variants: {
    kind: {
      text: 'h-lh',
      block: 'h-2xl',
      square: 'size-xl',
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
 * Placeholder shaped like content that is still loading. Hidden from assistive tech. GrayText under forced
 * colours, where its fill would match the page.
 */
@Component({
  selector: 'fr-skeleton',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
})
export class Skeleton {
  public readonly kind = input<SkeletonKind>(SkeletonKind.Text);
  public readonly width = input<SkeletonWidth>(SkeletonWidth.Md);

  protected readonly classes = computed(() => {
    const kind = this.kind();

    return skeletonVariants(kind === SkeletonKind.Square ? { kind } : { kind, width: this.width() });
  });
}
