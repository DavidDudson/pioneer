import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, LocaleFormat, TextArea } from '@pioneer/frontier';

/**
 * A text area read one line at a time (roots, picks, toggles, roll options): its label, its hint, and in place of the
 * hint an error naming the lines that do not read. `errorKey` takes `count` and `lines`.
 */
@Component({
  selector: 'pio-lines-field',
  imports: [Field, FieldError, FieldHint, Label, TextArea, TranslocoPipe],
  templateUrl: './lines-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinesField {
  readonly #format = inject(LocaleFormat);
  public readonly label = input.required<string>();
  public readonly hint = input.required<string>();
  public readonly errorKey = input.required<string>();
  public readonly rows = input.required<number>();
  /** The 1-based lines that do not read. */
  public readonly bad = input.required<readonly number[]>();
  public readonly value = model.required<string>();

  /** The bad lines as a list in the UI locale ("2, 4 and 7"). */
  protected readonly lineList = computed((): string => {
    this.#format.locale();
    return this.#format.list(this.bad().map((line) => this.#format.number(line)));
  });
}
