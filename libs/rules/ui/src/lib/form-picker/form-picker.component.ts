import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Button, Stack, Surface, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { OptionPicker } from '../option-picker/option-picker.component';

/** One form the cast offers, as the picker lists it. */
export interface FormPickerOption {
  readonly value: string;
  readonly label: string;
}

/** One statistic the form changes: its name, the character's own value and the form's, worded for display. */
export interface FormPreviewRow {
  readonly name: string;
  readonly own: string;
  readonly form: string;
}

/** What the picked form changes against the character's own numbers; empty rows when it changes none of those shown. */
export interface FormPreview {
  readonly rows: readonly FormPreviewRow[];
}

/** Message keys the picker renders with, spelled out so the key check sees them. */
const FormPickerMessage = {
  Title: 'rules.form.pickerTitle',
  TitleAction: 'rules.form.pickerTitleAction',
  Pick: 'rules.form.pick',
  Own: 'rules.form.previewOwn',
  Form: 'rules.form.previewForm',
  Unchanged: 'rules.form.previewUnchanged',
  Confirm: 'rules.form.confirm',
  ConfirmAction: 'rules.form.confirmAction',
  Cancel: 'rules.form.cancel',
} as const;

/**
 * The picker a battle form spell opens when it is cast: the forms it offers at the rank it is cast at, and for the form
 * picked what it changes against the character's own numbers, so the choice is made knowing what it does. Confirming
 * casts the spell and puts the form on the character; cancelling casts nothing.
 *
 * Presentational (ADR-0028): the caller passes the forms and the preview of the picked one, and runs the cast.
 *
 * ```html
 * <pio-form-picker [spell]="name" [options]="forms()" [(picked)]="picked" [preview]="preview()" [confirm]="cast" (cancelled)="close()" />
 * ```
 */
@Component({
  selector: 'pio-form-picker',
  imports: [AsyncButton, Button, OptionPicker, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './form-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPicker {
  /** The spell being cast, or the action used, by name. */
  public readonly spell = input.required<string>();
  /** Whether it is an action used rather than a spell cast, which words the title and the button. */
  public readonly action = input(false);
  public readonly options = input.required<readonly FormPickerOption[]>();
  /** The form picked, by its value; undefined until one is. */
  public readonly picked = model<string | undefined>(undefined);
  /** What the picked form changes; undefined until one is picked. */
  public readonly preview = input.required<FormPreview | undefined>();
  /** Casts the spell and applies the picked form. */
  public readonly confirm = input.required<() => Promise<void>>();
  public readonly describeError = input<((error: unknown) => string) | undefined>(undefined);
  /** Raised when the cast is given up. */
  public readonly cancelled = output();

  protected readonly Message = FormPickerMessage;

  protected readonly selectOptions = computed((): readonly SelectOption<string>[] =>
    this.options().map(({ value, label }) => ({ value, label })),
  );
}
