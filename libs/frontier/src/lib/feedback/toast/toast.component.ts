import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { cva } from 'class-variance-authority';

const pillClasses = cva(
  'pointer-events-auto inline-flex items-center gap-xs rounded-pill border border-line-strong bg-surface-raised px-md py-xs text-fg-default',
)();
const regionClasses = cva('contents')();

/**
 * A small pill pinned to the bottom centre of the screen that announces one thing politely (`role="status"`): the
 * result of a roll. The one toast in the app (ADR-0074); everything else is inline feedback. The status region stays in
 * the page while the pill is closed, so a screen reader announces each new content. The page underneath stays
 * clickable except where the pill is.
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
  /** Whether the pill shows; closed leaves only the empty status region. */
  public readonly open = input(false);

  protected readonly pill = pillClasses;
  protected readonly region = regionClasses;
}
