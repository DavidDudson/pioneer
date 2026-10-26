import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Message, MessageTone, Stack, Surface, Text, ToggleButton } from '@pioneer/frontier';

/** A line of what a form was applied with: a message key and the parameters it reads. */
export interface FormDetail {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** The form in force, as the banner words it: its name, then its source, rank and the time it has left. */
export interface FormSummary {
  readonly name: string;
  readonly details: readonly FormDetail[];
}

/** Message keys the banner renders with, spelled out so the key check sees them. */
const FormMessage = {
  Active: 'rules.form.active',
  Dismiss: 'rules.form.dismiss',
  BaseView: 'rules.form.baseView',
  Reference: 'rules.form.reference',
} as const;

/**
 * The banner that names the form the character is in, for the sheet header on every tab: the form in words, where it
 * came from, its rank and how long it lasts, with Dismiss to end it. A toggle shows the sheet without the form, marked
 * as a reference view; it does not end the form.
 *
 * Presentational (ADR-0028): the caller passes the form, or undefined when the character is in none (the banner is
 * then empty), and runs Dismiss.
 *
 * ```html
 * <pio-form-banner [form]="form()" [dismiss]="dismiss" [(baseView)]="baseView" />
 * ```
 */
@Component({
  selector: 'pio-form-banner',
  imports: [AsyncButton, Message, Stack, Surface, Text, ToggleButton, TranslocoPipe],
  templateUrl: './form-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormBanner {
  public readonly form = input.required<FormSummary | undefined>();
  /** Ends the form. */
  public readonly dismiss = input.required<() => Promise<void>>();
  public readonly describeError = input<((error: unknown) => string) | undefined>(undefined);
  /** Whether the sheet below shows the character without the form. */
  public readonly baseView = model(false);

  protected readonly Message = FormMessage;
  protected readonly info = MessageTone.Info;
}
