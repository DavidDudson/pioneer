import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { GAP, Space } from '../../tokens';

export const StackDirection = { Vertical: 'vertical', Horizontal: 'horizontal' } as const;
export type StackDirection = ValueOf<typeof StackDirection>;

export const StackAlign = {
  Start: 'start',
  Center: 'center',
  End: 'end',
  Stretch: 'stretch',
  Baseline: 'baseline',
} as const;
export type StackAlign = ValueOf<typeof StackAlign>;

export const StackJustify = { Start: 'start', Center: 'center', End: 'end', Between: 'between' } as const;
export type StackJustify = ValueOf<typeof StackJustify>;

const DIRECTION: Record<StackDirection, string> = { vertical: 'flex-col', horizontal: 'flex-row' };
const ALIGN: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};
const JUSTIFY: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

/** One-dimensional layout with token gaps. The default building block. */
@Component({
  selector: 'fr-stack',
  templateUrl: './stack.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Stack {
  public readonly direction = input<StackDirection>(StackDirection.Vertical);
  public readonly gap = input<Space>(Space.Md);
  public readonly align = input<StackAlign>(StackAlign.Stretch);
  public readonly justify = input<StackJustify>(StackJustify.Start);
  public readonly wrap = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      'flex min-w-0',
      DIRECTION[this.direction()],
      GAP[this.gap()],
      ALIGN[this.align()],
      JUSTIFY[this.justify()],
      this.wrap() ? 'flex-wrap' : '',
    ].join(' '),
  );
}
