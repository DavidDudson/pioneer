import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Combobox } from '../combobox/combobox.component';
import type { ComboboxOption } from '../combobox/combobox.component';
import type { SelectOption } from '../select/select.component';
import { ToggleGroup } from '../toggle-group/toggle-group.component';
import { FilterOperator, TOGGLE_GROUP_LIMIT } from './filter-bar.types';
import type { FilterField } from './filter-bar.types';

/**
 * The value editor of a `set` filter: up to 8 options as a toggle group, more as a searchable, virtual multi-select.
 * Options show their counts. The long list narrows as it is typed in, tells the app what was typed (`searched`) and
 * asks for the next options as it is scrolled (`moreRequested`, while the field has `hasMore`). One pick for `is` and
 * `is not`, any number for `is any of`. Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-set-values',
  imports: [Combobox, ToggleGroup, TranslocoPipe],
  templateUrl: './filter-set-values.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterSetValues {
  public readonly field = input.required<FilterField>();
  public readonly operator = input.required<FilterOperator>();
  public readonly values = model<ReadonlyArray<string>>([]);
  /** A person typed in the long list's search box. */
  public readonly searched = output<string>();
  /** The long list was scrolled near its end while the field has more options. */
  public readonly moreRequested = output();

  readonly #transloco = inject(TranslocoService);
  /** What is typed in the long list's search box, so the list narrows as it is typed. */
  readonly #query = signal('');

  protected readonly selected = computed<ReadonlySet<string>>(() => new Set(this.values()));
  protected readonly options = computed<ReadonlyArray<SelectOption<string>>>(() =>
    (this.field().options ?? []).map(({ value, label, count }) => ({
      value,
      label:
        count === undefined ? label : this.#transloco.translate('frontier.filterBar.optionCount', { label, count }),
    })),
  );
  /** Few enough options to show all at once. */
  protected readonly fewOptions = computed(() => this.options().length <= TOGGLE_GROUP_LIMIT);
  /** The long list's options that match what is typed. */
  protected readonly matches = computed<ReadonlyArray<ComboboxOption<string>>>(() => {
    const query = this.#query().trim().toLowerCase();

    return this.options().filter((option) => option.label.toLowerCase().includes(query));
  });

  protected typed(query: string): void {
    this.#query.set(query);
  }

  protected choose(next: ReadonlySet<string>): void {
    this.chooseAll([...next]);
  }

  /** Only `is any of` keeps several; the others keep the value pressed last. */
  protected chooseAll(next: ReadonlyArray<string>): void {
    if (this.operator() === FilterOperator.IsAnyOf) {
      this.values.set([...next]);

      return;
    }

    const pressed = next.filter((value) => !this.selected().has(value));
    this.values.set(pressed.length > 0 ? pressed : [...next]);
  }
}
