import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

/** How loudly the toast speaks: a plain result, or the gold and red edge a natural 20 or natural 1 earns. */
export const ToastEmphasis = { None: 'none', High: 'high', Low: 'low' } as const;
export type ToastEmphasis = ValueOf<typeof ToastEmphasis>;

const toastClasses = cva(
  'pointer-events-auto inline-flex items-center gap-xs rounded-toast border bg-surface-raised px-md py-xs text-fg-default',
  {
    variants: {
      emphasis: {
        [ToastEmphasis.None]: 'border-line-strong',
        [ToastEmphasis.High]: 'animate-natural-pop border-natural-max',
        [ToastEmphasis.Low]: 'animate-natural-pop border-natural-min',
      } satisfies Record<ToastEmphasis, string>,
    },
    defaultVariants: { emphasis: ToastEmphasis.None },
  },
);
const regionClasses = cva('contents')();

/**
 * A small rounded panel pinned to the bottom centre of the screen that announces one thing politely (`role="status"`): the
 * result of a roll. The one toast in the app (ADR-0074); everything else is inline feedback. The status region stays in
 * the page while the toast is closed, so a screen reader announces each new content. The page underneath stays
 * clickable except where the toast is. `emphasis` pops it in with a gold edge (`high`) or a red one (`low`); reduced
 * motion keeps the edge and drops the pop.
 *
 * ```html
 * <fr-toast [open]="result() !== undefined"><fr-text>{{ result() }}</fr-text></fr-toast>
 * ```
 */
@Component({
  selector: 'fr-toast',
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-x-none bottom-lg z-overlay flex justify-center pb-safe-bottom' },
})
export class Toast {
  /** Whether the toast shows; closed leaves only the empty status region. */
  public readonly open = input(false);
  public readonly emphasis = input<ToastEmphasis>(ToastEmphasis.None);

  protected readonly surface = computed((): string => toastClasses({ emphasis: this.emphasis() }));
  protected readonly region = regionClasses;
}
