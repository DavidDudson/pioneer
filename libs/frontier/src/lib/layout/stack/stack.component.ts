import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import type { Container, Space } from '../../tokens';
import { GapRole, gapVariants } from '../../tokens';

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

const hostVariants = cva('block min-w-none', {
  variants: { responsive: { true: '@container', false: '' }, grow: { true: 'flex-1', false: '' } },
});

const stackVariants = cva('flex', {
  variants: {
    direction: { vertical: 'flex-col', horizontal: 'flex-row' } satisfies Record<StackDirection, string>,
    horizontalFrom: {
      sm: '@sm:flex-row',
      md: '@md:flex-row',
      lg: '@lg:flex-row',
    } satisfies Record<Container, string>,
    gap: gapVariants,
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    } satisfies Record<StackAlign, string>,
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    } satisfies Record<StackJustify, string>,
    wrap: { true: 'flex-wrap', false: '' },
  },
});

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
  /**
   * The gap between children, by role: `none` for parts that touch; `3xs` for icon and text inside one control;
   * `2xs` a title and its caption, a label and its field; `xs` chips and inline controls; `sm` the items of a
   * list and the cells of a row; `md` the parts of a card or section (the default); `lg` cards in a group;
   * `xl` the parts of a page body; `2xl` and `3xl` page regions. A part owns its gap (see `GapRole`), so a
   * page picks one only when it composes parts itself.
   */
  public readonly gap = input<Space>(GapRole.Card);
  public readonly align = input<StackAlign>(StackAlign.Stretch);
  public readonly justify = input<StackJustify>(StackJustify.Start);
  public readonly wrap = input(false, { transform: booleanAttribute });
  public readonly horizontalFrom = input<Container | undefined>(undefined);
  /** Take the remaining space when this stack sits in a row. */
  public readonly grow = input(false, { transform: booleanAttribute });

  protected readonly hostClasses = computed(() =>
    hostVariants({ responsive: this.horizontalFrom() !== undefined, grow: this.grow() }),
  );
  protected readonly classes = computed(() =>
    stackVariants({
      direction: this.direction(),
      horizontalFrom: this.horizontalFrom(),
      gap: this.gap(),
      align: this.align(),
      justify: this.justify(),
      wrap: this.wrap(),
    }),
  );
}
