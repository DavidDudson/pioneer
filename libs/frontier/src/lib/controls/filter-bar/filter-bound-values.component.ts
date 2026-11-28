import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Input, InputType } from '../input/input.component';
import { NumberInput } from '../number-input/number-input.component';
import { FilterKind, FilterOperator } from './filter-bar.types';
import type { FilterField } from './filter-bar.types';

const rangeClasses = cva('flex flex-wrap items-center gap-xs')();

function toNumber(text: string | undefined): number | undefined {
  const parsed = text === undefined || text === '' ? Number.NaN : Number(text);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/**
 * The value editor of a `range` or `date` filter: one box for `is`, two for `between` (either may stay empty, an open
 * end). Number boxes for a range, date boxes for a date. Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-bound-values',
  imports: [Input, NumberInput, TranslocoPipe],
  templateUrl: './filter-bound-values.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterBoundValues {
  public readonly field = input.required<FilterField>();
  public readonly operator = input.required<FilterOperator>();
  /** The bounds as text: one for `is`, `[min, max]` for `between`, `''` for an open end. */
  public readonly values = model<ReadonlyArray<string>>([]);

  protected readonly rangeClasses = rangeClasses;
  protected readonly dateType = InputType.Date;

  protected readonly isDate = computed(() => this.field().kind === FilterKind.Date);
  protected readonly isBetween = computed(() => this.operator() === FilterOperator.Between);
  protected readonly minLabel = computed(() =>
    this.isBetween() ? 'frontier.filterBar.min' : 'frontier.filterBar.value',
  );
  protected readonly min = computed(() => this.values()[0] ?? '');
  protected readonly max = computed(() => this.values()[1] ?? '');
  protected readonly minNumber = computed(() => toNumber(this.values()[0]));
  protected readonly maxNumber = computed(() => toNumber(this.values()[1]));

  protected setMin(value: number | undefined): void {
    this.setMinText(toText(value));
  }

  protected setMax(value: number | undefined): void {
    this.setMaxText(toText(value));
  }

  protected setMinText(text: string): void {
    const rest = this.isBetween() ? [this.values()[1] ?? ''] : [];
    this.values.set([text, ...rest]);
  }

  protected setMaxText(text: string): void {
    this.values.set([this.values()[0] ?? '', text]);
  }
}
