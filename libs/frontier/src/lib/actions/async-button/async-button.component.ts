import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { injectAsyncAction } from '../../async/async-action';
import { AsyncIndicator } from '../../async/async-indicator/async-indicator.component';
import { Message } from '../../feedback/message/message.component';
import { AsyncForm } from '../../forms/async-form/async-form.component';
import { uniqueId } from '../../ids';
import { Stack } from '../../layout/stack/stack.component';
import { Size } from '../../tokens';
import { Button, ButtonType, ButtonVariant } from '../button/button.component';

/**
 * A button that runs an async action and shows its state in place:
 * spinner while pending (presses ignored), a tick on success, then back to
 * rest; a failure shows its message inline under the button.
 *
 * Standalone, pass `[action]`. As `type="submit"` inside `fr-async-form`, it
 * shows the form's submission instead and takes no action of its own.
 *
 * ```html
 * <fr-async-button [action]="archive" successLabel="Archived">Archive</fr-async-button>
 * ```
 */
@Component({
  selector: 'fr-async-button',
  imports: [AsyncIndicator, Button, Message, Stack],
  templateUrl: './async-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AsyncButton {
  public readonly action = input<() => Promise<unknown>>(async () => undefined);
  public readonly variant = input<ButtonVariant>(ButtonVariant.Secondary);
  public readonly size = input<Size>(Size.Md);
  public readonly type = input<ButtonType>(ButtonType.Button);
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly pendingLabel = input('Working');
  public readonly successLabel = input('Done');
  public readonly describeError = input<(error: unknown) => string>(() => 'Something went wrong. Try again.');
  public readonly succeeded = output();

  readonly #form = inject(AsyncForm, { optional: true }) ?? undefined;
  readonly #own = injectAsyncAction(() => this.action(), {
    describeError: (error) => this.describeError()(error),
    onSuccess: () => {
      this.succeeded.emit();
    },
  });

  /** A submit button reflects its form; anything else runs its own action. */
  protected readonly state = computed(() =>
    this.type() === ButtonType.Submit && this.#form !== undefined ? this.#form.submission : this.#own,
  );
  protected readonly errorId = uniqueId('fr-async-button-error');

  protected press(): void {
    if (this.type() !== ButtonType.Submit) {
      this.#own.run();
    }
  }
}
