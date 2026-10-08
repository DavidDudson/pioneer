import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { Container } from '../../tokens';
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
const HORIZONTAL_FROM: Record<Container, string> = {
  sm: '@sm:flex-row',
  md: '@md:flex-row',
  lg: '@lg:flex-row',
};
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

/**
 * One-dimensional layout with token gaps. The default building block.
 * `direction` is the narrow layout; `horizontalFrom` turns a vertical stack
 * into a row once the stack itself is at least that container size wide.
 *
 * An element can't query its own size, so the host is the box (and, when
 * responsive, the query container) and an inner element is the flexbox. A
 * responsive stack fills its parent's width: inline-size containment means
 * it can't shrink-wrap its content.
 */
@Component({
  selector: 'fr-stack',
  templateUrl: './stack.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
})
export class Stack {
  public readonly direction = input<StackDirection>(StackDirection.Vertical);
  public readonly gap = input<Space>(Space.Md);
  public readonly align = input<StackAlign>(StackAlign.Stretch);
  public readonly justify = input<StackJustify>(StackJustify.Start);
  public readonly wrap = input(false, { transform: booleanAttribute });
  public readonly horizontalFrom = input<Container | undefined>(undefined);

  protected readonly hostClasses = computed(() =>
    this.horizontalFrom() === undefined ? 'block min-w-0' : '@container block min-w-0',
  );
  protected readonly classes = computed(() => {
    const horizontalFrom = this.horizontalFrom();
    return [
      'flex',
      DIRECTION[this.direction()],
      horizontalFrom === undefined ? '' : HORIZONTAL_FROM[horizontalFrom],
      GAP[this.gap()],
      ALIGN[this.align()],
      JUSTIFY[this.justify()],
      this.wrap() ? 'flex-wrap' : '',
    ].join(' ');
  });
}
