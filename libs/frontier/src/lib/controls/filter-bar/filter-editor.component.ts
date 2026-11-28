import { ChangeDetectionStrategy, Component, computed, effect, input, linkedSignal, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { elevationVariants, Size } from '../../tokens';
import { FilterOperator, isComplete, OPERATOR_LABELS, operatorsFor } from './filter-bar.types';
import type { FilterCondition, FilterField, FilterSearch } from './filter-bar.types';
import { FilterValues } from './filter-values.component';

const panelClasses = cva(`flex flex-col gap-sm border p-sm ${elevationVariants.raised}`)();
const rowClasses = cva('flex flex-wrap items-center gap-xs')();

/** Whether `condition` is the filter the panel was given, so a change the panel itself made is not fired twice. */
function sameCondition(condition: FilterCondition, initial: FilterCondition | undefined): boolean {
  return (
    initial !== undefined &&
    initial.field === condition.field &&
    initial.operator === condition.operator &&
    initial.values.length === condition.values.length &&
    initial.values.every((value, index) => value === condition.values[index])
  );
}

/**
 * The inline panel where a filter is made or changed: pick a field, then an operator, then the values. It opens
 * in place under the bar (never a popover). There is no Apply: `changed` fires with the filter each time it is
 * complete, and again as its values change. *Done* closes the panel. Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-editor',
  imports: [Button, FilterValues, TranslocoPipe],
  templateUrl: './filter-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterEditor {
  public readonly fields = input.required<ReadonlyArray<FilterField>>();
  /** The filter being changed; absent for a new one. */
  public readonly initial = input<FilterCondition | undefined>(undefined);
  /** The filter, complete, after each change that leaves it so. */
  public readonly changed = output<FilterCondition>();
  /** *Done* was pressed on a filter whose values were all cleared: it filters nothing now, so it goes. */
  public readonly cleared = output();
  public readonly closed = output();
  /** A person typed in the option search of a long `set` field. */
  public readonly searched = output<FilterSearch>();
  /** A long `set` field was scrolled near its end: the id of the field wanting more options. */
  public readonly moreRequested = output<string>();

  protected readonly panelClasses = panelClasses;
  protected readonly rowClasses = rowClasses;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly Size = Size;
  protected readonly operatorLabels = OPERATOR_LABELS;

  readonly #fieldId = linkedSignal(() => this.initial()?.field);
  readonly #operator = linkedSignal<FilterOperator | undefined>(() => this.initial()?.operator);
  protected readonly values = linkedSignal<ReadonlyArray<string>>(() => this.initial()?.values ?? []);

  protected readonly field = computed(() => this.fields().find((candidate) => candidate.id === this.#fieldId()));
  protected readonly operators = computed(() => {
    const field = this.field();

    return field === undefined ? [] : operatorsFor(field.kind);
  });
  /** The chosen operator, or the field's first until one is pressed. */
  protected readonly operator = computed(() => {
    const operators = this.operators();
    const chosen = this.#operator();

    return chosen !== undefined && operators.includes(chosen) ? chosen : operators[0];
  });
  /** What the values are for: the operator, or `is` before the field has one. */
  protected readonly valueOperator = computed(() => this.operator() ?? FilterOperator.Is);
  protected readonly condition = computed<FilterCondition | undefined>(() => {
    const field = this.field();
    const operator = this.operator();

    return field === undefined || operator === undefined
      ? undefined
      : { field: field.id, operator, values: this.values() };
  });
  protected readonly complete = computed(() => {
    const condition = this.condition();

    return condition !== undefined && isComplete(condition);
  });

  public constructor() {
    effect(() => {
      const condition = this.condition();

      if (condition !== undefined && this.complete() && !sameCondition(condition, this.initial())) {
        this.changed.emit(condition);
      }
    });
  }

  protected done(): void {
    if (this.initial() !== undefined && !this.complete()) {
      this.cleared.emit();
    }

    this.closed.emit();
  }

  protected search(query: string): void {
    const field = this.field();

    if (field !== undefined) {
      this.searched.emit({ field: field.id, query });
    }
  }

  protected pickField(id: string): void {
    if (id !== this.#fieldId()) {
      this.#fieldId.set(id);
      this.#operator.set(undefined);
      this.values.set([]);
    }
  }

  protected pickOperator(operator: FilterOperator): void {
    this.#operator.set(operator);
  }

  protected requestMore(): void {
    const field = this.field();

    if (field !== undefined) {
      this.moreRequested.emit(field.id);
    }
  }
}
