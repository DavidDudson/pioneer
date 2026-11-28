import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { injectTranslate } from '@pioneer/frontier';
import { injectPropertyContext, Picker, PROPERTY_KINDS, tableFromProperties } from '@pioneer/frontier/data';
import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

import { FEAT_PICKER_COLUMNS, FEAT_PROPERTIES } from '../properties/feat-properties';
import { provideRulesPropertyKinds } from '../properties/rules-property-kinds';
import { FeatPickerColumn } from './feat-picker-row';
import type { FeatPickerRow } from './feat-picker-row';

const rowValue = (row: FeatPickerRow): string => row.id;
const rowLabel = (row: FeatPickerRow): string => row.name;
const rowDisabled = (row: FeatPickerRow): string | undefined => row.disabledReason;

function compare(left: FeatPickerRow, right: FeatPickerRow, sort: PickerSort): number {
  const order =
    sort.column === FeatPickerColumn.Level
      ? left.level - right.level
      : left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

  return sort.descending ? -order : order;
}

/**
 * Pick a feat from a table of what decides the choice: level, category, action cost, traits, prerequisites with
 * their state, and where it comes from. Opens inline and starts at the search box, so it suits an inline editor.
 * A feat the character can't take stays in the table, disabled, saying why. The table searches by name and sorts by
 * name or level on the rows it is given.
 *
 * ```html
 * <pio-feat-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Class feat, level 2" />
 * ```
 */
@Component({
  selector: 'pio-feat-picker',
  imports: [Picker],
  templateUrl: './feat-picker.component.html',
  providers: [provideRulesPropertyKinds()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FeatPicker {
  /** Every feat the slot offers, with the facts of each. */
  public readonly rows = input.required<ReadonlyArray<FeatPickerRow>>();
  /** The picked feat's id; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** A feat was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #kinds = inject(PROPERTY_KINDS);
  readonly #context = injectPropertyContext();
  /** Changes when the language changes or the messages load, so the headers are read again. */
  readonly #messages = injectTranslate();

  protected readonly columns = computed((): ReadonlyArray<TableColumn<FeatPickerRow>> => {
    this.#messages();

    return tableFromProperties<FeatPickerRow>(FEAT_PROPERTIES, FEAT_PICKER_COLUMNS, {
      kinds: this.#kinds,
      context: this.#context,
    }).build();
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed((): ReadonlyArray<FeatPickerRow> => {
    const needle = this.query().trim().toLocaleLowerCase();
    const sort = this.sorting();
    const matching = this.rows().filter((row) => row.name.toLocaleLowerCase().includes(needle));

    return sort === undefined ? matching : matching.toSorted((left, right) => compare(left, right, sort));
  });

  protected readonly rowValue = rowValue;
  protected readonly rowLabel = rowLabel;
  protected readonly rowDisabled = rowDisabled;
}
