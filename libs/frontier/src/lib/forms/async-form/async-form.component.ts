import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { submit } from '@angular/forms/signals';
import type { FieldTree } from '@angular/forms/signals';
import { injectHotkey } from '@tanstack/angular-hotkeys';
import type { InjectHotkeyOptions } from '@tanstack/angular-hotkeys';
import { cva } from 'class-variance-authority';

import { injectAsyncAction } from '../../async/async-action';
import type { AsyncAction } from '../../async/async-action';
import { SubmitFailureError } from './submit-failure-error';

const formClasses = cva('block')();

/**
 * A form whose submit calls the server. Validates through signal forms
 * (`submit()` marks every field touched and only runs the action when valid),
 * then runs `action` with the model's value as a TanStack mutation.
 * `fr-async-button type="submit"` inside shows the submission: spinner while
 * pending, a tick on success, the failure inline. Mod+Enter submits from
 * anywhere in the form.
 *
 * ```html
 * <fr-async-form [form]="form" [action]="create">
 *   <fr-text-field label="Name" [formField]="form.name" />
 *   <fr-async-button type="submit" variant="primary">Create</fr-async-button>
 * </fr-async-form>
 * ```
 */
@Component({
  selector: 'fr-async-form',
  templateUrl: './async-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AsyncForm<TModel> {
  public readonly form = input.required<FieldTree<TModel>>();
  public readonly action = input.required<(value: TModel) => Promise<unknown>>();
  public readonly describeError = input<(error: unknown) => string>(() => 'Could not save. Try again.');
  public readonly succeeded = output();

  /** The submission's state, for the submit button and anything else in the form. */
  public readonly submission: AsyncAction<void> = injectAsyncAction(() => async () => this.#submit(), {
    // An invalid form never ran the action: back to idle, no tick.
    accept: (submitted) => submitted,
    describeError: (error) => this.describeError()(error instanceof SubmitFailureError ? error.cause : error),
    onSuccess: () => {
      this.succeeded.emit();
    },
  });

  protected readonly classes = formClasses;
  protected readonly element = viewChild<ElementRef<HTMLFormElement>>('element');

  public constructor() {
    injectHotkey(
      'Mod+Enter',
      () => {
        this.element()?.nativeElement.requestSubmit();
      },
      (): InjectHotkeyOptions => {
        const target = this.element()?.nativeElement;
        return target === undefined ? { enabled: false } : { target, ignoreInputs: false };
      },
    );
  }

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.submission.run();
  }

  /** Resolves whether the form was valid and submitted; rejects with the action's failure. */
  async #submit(): Promise<boolean> {
    const failures: SubmitFailureError[] = [];
    const submitted = await submit(this.form(), async (field) => {
      try {
        await this.action()(field().value());
      } catch (error: unknown) {
        failures.push(new SubmitFailureError(error));
      }
      return undefined;
    });
    const [failure] = failures;
    if (failure !== undefined) {
      throw failure;
    }
    return submitted;
  }
}
