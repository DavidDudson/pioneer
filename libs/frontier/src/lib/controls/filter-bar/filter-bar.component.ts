import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Text } from '../../text/text/text.component';
import { Size } from '../../tokens';
import { OPERATOR_LABELS, valueText } from './filter-bar.types';
import type { FilterCondition, FilterField, Translate } from './filter-bar.types';
import { FilterEditor } from './filter-editor.component';

const barClasses = cva('flex flex-col gap-sm')();
const rowClasses = cva('flex flex-wrap items-center gap-xs')();
const chipClasses = cva('inline-flex items-center border border-line-default bg-surface-base')();

/** A filter as its chip shows it. */
interface Chip {
  readonly index: number;
  /** The whole filter as one phrase: the chip text, and the base of the buttons' names. */
  readonly phrase: string;
}

/**
 * Narrows a list with filters, each an editable chip: *Add filter* opens a panel in place under the bar, where a
 * field, then an operator (is, is not, is any of, between), then the values are picked. A chip opens the same
 * panel on its filter; its cross removes it; *Clear all* removes every one. The bar wraps and never scrolls
 * sideways.
 *
 * `fields` are what the list can be narrowed by; `value` is the filters, each `{ field, operator, values }`.
 * frontier knows no schemas, so the app maps a field list and a value to and from its own filter state.
 *
 * ```html
 * <fr-filter-bar [fields]="fields()" [(value)]="filters" />
 * ```
 */
@Component({
  selector: 'fr-filter-bar',
  imports: [Button, FilterEditor, Icon, Text, TranslocoPipe],
  templateUrl: './filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FilterBar {
  public readonly fields = input.required<readonly FilterField[]>();
  public readonly value = model<readonly FilterCondition[]>([]);

  protected readonly barClasses = barClasses;
  protected readonly rowClasses = rowClasses;
  protected readonly chipClasses = chipClasses;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly Size = Size;
  protected readonly closeIcon = LucideX;

  readonly #transloco = inject(TranslocoService);
  /** Whether the panel is open. */
  protected readonly open = signal(false);
  /** The filter the panel is changing; absent for a new one. */
  protected readonly editing = signal<number | undefined>(undefined);

  protected readonly initial = computed(() => {
    const index = this.editing();
    return index === undefined ? undefined : this.value()[index];
  });
  protected readonly chips = computed<readonly Chip[]>(() => {
    const translate: Translate = (key, params) => this.#transloco.translate(key, params);
    return this.value().flatMap((condition, index) => {
      const field = this.fields().find((candidate) => candidate.id === condition.field);
      if (field === undefined) {
        return [];
      }
      const operator = translate(OPERATOR_LABELS[condition.operator]);
      const values = valueText(field, condition, translate);
      return [{ index, phrase: `${field.label} ${operator} ${values}` }];
    });
  });

  protected add(): void {
    this.editing.set(undefined);
    this.open.set(true);
  }

  protected edit(index: number): void {
    this.editing.set(index);
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
    this.editing.set(undefined);
  }

  protected apply(condition: FilterCondition): void {
    const index = this.editing();
    this.value.update((filters) =>
      index === undefined ? [...filters, condition] : filters.map((filter, at) => (at === index ? condition : filter)),
    );
    this.close();
  }

  protected remove(index: number): void {
    this.value.update((filters) => filters.filter((_filter, at) => at !== index));
    this.close();
  }

  protected clear(): void {
    this.value.set([]);
    this.close();
  }
}
