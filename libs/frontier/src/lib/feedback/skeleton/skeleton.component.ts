import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

export const SkeletonShape = { Text: 'text', Block: 'block', Square: 'square' } as const;
export type SkeletonShape = ValueOf<typeof SkeletonShape>;

export const SkeletonWidth = { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Full: 'full' } as const;
export type SkeletonWidth = ValueOf<typeof SkeletonWidth>;

const skeletonVariants = cva('block animate-shimmer bg-surface-skeleton', {
  variants: {
    shape: {
      text: 'h-lh',
      block: 'h-2xl',
      square: 'size-xl',
    } satisfies Record<SkeletonShape, string>,
    width: {
      xs: 'w-xl',
      sm: 'w-3xl',
      md: 'w-placeholder-md',
      lg: 'w-placeholder-lg',
      full: 'w-full',
    } satisfies Record<SkeletonWidth, string>,
  },
});

/** Placeholder shaped like content that is still loading. Hidden from assistive tech. */
@Component({
  selector: 'fr-skeleton',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
})
export class Skeleton {
  public readonly shape = input<SkeletonShape>(SkeletonShape.Text);
  public readonly width = input<SkeletonWidth>(SkeletonWidth.Md);

  protected readonly classes = computed(() => {
    const shape = this.shape();
    return skeletonVariants(shape === SkeletonShape.Square ? { shape } : { shape, width: this.width() });
  });
}
