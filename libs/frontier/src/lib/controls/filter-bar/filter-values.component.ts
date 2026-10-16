import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { FilterChips } from '../filter-chips/filter-chips.component';
import { OptionalNumberInput } from '../optional-number-input/optional-number-input.component';
import type { SelectOption } from '../select/select.component';
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
 * The value half of a filter being edited: option chips for a `set` or `flag` field (one pick for `is` and
 * `is not`, any number for `is any of`), or one or two number boxes for a `range` field. Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-values',
  imports: [FilterChips, OptionalNumberInput, TranslocoPipe],
  templateUrl: './filter-values.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterValues {
  public readonly field = input.required<FilterField>();
  public readonly operator = input.required<FilterOperator>();
  public readonly values = model<readonly string[]>([]);

  protected readonly rangeClasses = rangeClasses;

  readonly #transloco = inject(TranslocoService);

  protected readonly isRange = computed(() => this.field().kind === FilterKind.Range);
  protected readonly isBetween = computed(() => this.operator() === FilterOperator.Between);
  protected readonly minLabel = computed(() =>
    this.isBetween() ? 'frontier.filterBar.min' : 'frontier.filterBar.value',
  );
  protected readonly min = computed(() => toNumber(this.values()[0]));
  protected readonly max = computed(() => toNumber(this.values()[1]));
  protected readonly selected = computed<ReadonlySet<string>>(() => new Set(this.values()));
  protected readonly options = computed<readonly SelectOption<string>[]>(() =>
    (this.field().options ?? []).map(({ value, label, count }) => ({
      value,
      label:
        count === undefined ? label : this.#transloco.translate('frontier.filterBar.optionCount', { label, count }),
    })),
  );

  protected setMin(value: number | undefined): void {
    const rest = this.isBetween() ? [this.values()[1] ?? ''] : [];
    this.values.set([toText(value), ...rest]);
  }

  protected setMax(value: number | undefined): void {
    this.values.set([this.values()[0] ?? '', toText(value)]);
  }

  /** Only `is any of` keeps several; the others keep the value pressed last. */
  protected choose(next: ReadonlySet<string>): void {
    if (this.operator() === FilterOperator.IsAnyOf) {
      this.values.set([...next]);
      return;
    }
    const pressed = [...next].filter((value) => !this.selected().has(value));
    this.values.set(pressed.length > 0 ? pressed : [...next]);
  }
}
