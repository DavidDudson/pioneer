import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Size } from '../../tokens';
import { FilterOperator, isComplete, OPERATOR_LABELS, operatorsFor } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';
import { FilterValues } from './filter-values.component';

const panelClasses = cva('flex flex-col gap-sm border border-line-default bg-surface-base p-sm')();
const rowClasses = cva('flex flex-wrap items-center gap-xs')();

/**
 * The inline panel where a filter is made or changed: pick a field, then an operator, then the values. It opens
 * in place under the bar (never a popover). Part of `fr-filter-bar`.
 */
@Component({
  selector: 'fr-filter-editor',
  imports: [Button, FilterValues, TranslocoPipe],
  templateUrl: './filter-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterEditor {
  public readonly fields = input.required<readonly FilterField[]>();
  /** The filter being changed; absent for a new one. */
  public readonly initial = input<FilterCondition | undefined>(undefined);
  public readonly applied = output<FilterCondition>();
  public readonly cancelled = output();

  protected readonly panelClasses = panelClasses;
  protected readonly rowClasses = rowClasses;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly Size = Size;
  protected readonly operatorLabels = OPERATOR_LABELS;

  readonly #fieldId = linkedSignal(() => this.initial()?.field);
  readonly #operator = linkedSignal<FilterOperator | undefined>(() => this.initial()?.operator);
  protected readonly values = linkedSignal<readonly string[]>(() => this.initial()?.values ?? []);

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

  protected apply(): void {
    const condition = this.condition();
    if (condition !== undefined && this.complete()) {
      this.applied.emit(condition);
    }
  }
}
