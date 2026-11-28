import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { Temporal } from '@pioneer/shared/kernel';

import { Control } from '../control';
import { Input } from '../input/input.component';

/** Plain calendar date control backed by `Temporal.PlainDate` (native picker). In a form use `fr-date-field`. */
@Component({
  selector: 'fr-date-input',
  imports: [Input],
  templateUrl: './date-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DateInput extends Control {
  public readonly value = model<Temporal.PlainDate | undefined>(undefined);

  protected readonly iso = computed(() => this.value()?.toString() ?? '');

  protected onInput(raw: string): void {
    this.value.set(raw === '' ? undefined : Temporal.PlainDate.from(raw));
  }
}
