import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { SearchInput } from '../search-input/search-input.component';
import { Segmented } from '../segmented/segmented.component';
import type { SelectOption } from '../select/select.component';
import { FilterKind, isBounded } from './filter-bar.types';
import type { FilterField, FilterOperator } from './filter-bar.types';
import { FilterBoundValues } from './filter-bound-values.component';
import { FilterSetValues } from './filter-set-values.component';

/**
 * The value editor of a filter, by the kind of its field, always inline and with no Apply: every change is in
 * `values` at once.
 *
 * - `set`: up to 8 options as a toggle group; more as a searchable, virtual multi-select with counts, which asks
 *   for the next options as it is scrolled (`moreRequested`) and for matches as it is typed in (`searched`).
 * - `range`: one or two number boxes.
 * - `flag`: a segmented yes or no.
 * - `text`: a search box.
 * - `date`: one or two date boxes.
 *
 * Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-values',
  imports: [FilterBoundValues, FilterSetValues, SearchInput, Segmented, TranslocoPipe],
  templateUrl: './filter-values.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterValues {
  public readonly field = input.required<FilterField>();
  public readonly operator = input.required<FilterOperator>();
  public readonly values = model<ReadonlyArray<string>>([]);
  /** A person typed in a long list's search box. */
  public readonly searched = output<string>();
  /** A long list was scrolled near its end while the field has more options. */
  public readonly moreRequested = output();

  protected readonly Kind = FilterKind;

  protected readonly bounded = computed(() => isBounded(this.field().kind));
  protected readonly text = computed(() => this.values()[0] ?? '');
  protected readonly options = computed<ReadonlyArray<SelectOption<string>>>(() =>
    (this.field().options ?? []).map(({ value, label }) => ({ value, label })),
  );

  protected setText(text: string): void {
    this.values.set(text === '' ? [] : [text]);
  }

  protected setFlag(value: string | undefined): void {
    this.values.set(value === undefined ? [] : [value]);
  }
}
