import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

export const SkeletonShape = { Text: 'text', Block: 'block', Circle: 'circle' } as const;
export type SkeletonShape = ValueOf<typeof SkeletonShape>;

export const SkeletonWidth = { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Full: 'full' } as const;
export type SkeletonWidth = ValueOf<typeof SkeletonWidth>;

const SHAPE: Record<SkeletonShape, string> = {
  text: 'h-[1lh] rounded-control',
  block: 'h-2xl rounded-surface',
  circle: 'size-xl rounded-pill',
};
const WIDTH: Record<SkeletonWidth, string> = {
  xs: 'w-xl',
  sm: 'w-3xl',
  md: 'w-[8rem]',
  lg: 'w-[14rem]',
  full: 'w-full',
};

/** Placeholder for content that is still loading. Hidden from assistive tech. */
@Component({
  selector: 'fr-skeleton',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
})
export class Skeleton {
  public readonly shape = input<SkeletonShape>(SkeletonShape.Text);
  public readonly width = input<SkeletonWidth>(SkeletonWidth.Md);

  protected readonly classes = computed(() =>
    [
      'block animate-shimmer bg-surface-skeleton',
      SHAPE[this.shape()],
      this.shape() === SkeletonShape.Circle ? '' : WIDTH[this.width()],
    ].join(' '),
  );
}
