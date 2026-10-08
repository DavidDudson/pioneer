import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideCheck } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Spinner } from '../../feedback/spinner/spinner.component';
import { Icon } from '../../icon/icon.component';
import { AsyncStatus } from '../async-action';

const indicatorVariants = cva('inline-flex shrink-0 items-center gap-2xs', {
  variants: { status: { idle: '', pending: '', success: 'text-success-fg', error: 'text-danger-fg' } },
});
const labelVariants = cva('', { variants: { visible: { true: 'text-caption', false: 'sr-only' } } });

/**
 * What an async action is doing, in place: a spinner while pending, a tick
 * on success, nothing at rest. Errors are shown by the owner as a
 * `fr-message`, next to the thing that failed.
 */
@Component({
  selector: 'fr-async-indicator',
  imports: [Icon, Spinner, TranslocoPipe],
  templateUrl: './async-indicator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AsyncIndicator {
  public readonly status = input.required<AsyncStatus>();
  /** Defaults to a generic "Working" / "Done" in the viewer's locale. */
  public readonly pendingLabel = input<string | undefined>(undefined);
  public readonly successLabel = input<string | undefined>(undefined);
  /** Show the success label as text (e.g. "Saved" beside the tick); otherwise it is for screen readers only. */
  public readonly showLabel = input(false, { transform: booleanAttribute });

  protected readonly Status = AsyncStatus;
  protected readonly TickIcon = LucideCheck;
  protected readonly classes = computed(() => indicatorVariants({ status: this.status() }));
  protected readonly labelClasses = computed(() => labelVariants({ visible: this.showLabel() }));
}
