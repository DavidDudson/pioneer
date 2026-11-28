import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { injectTranslate } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';

import type { SpellPickerRow } from './spell-picker-row';
import {
  shownSpellRows,
  spellPickerColumns,
  spellRowDisabled,
  spellRowLabel,
  spellRowValue,
} from './spell-picker-table';

/**
 * Pick a spell from a table of what decides the choice: rank (a cantrip, or the rank a slot casts it at), traditions,
 * cast cost, range, area or targets, duration, what it is rolled against, traits and where it comes from. Opens inline
 * and starts at the search box, so it suits an inline editor. A spell the slot can't take stays in the table,
 * disabled, saying why. The table searches by name and sorts by name or rank on the rows it is given.
 *
 * ```html
 * <pio-spell-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="3rd rank slot 1" />
 * ```
 */
@Component({
  selector: 'pio-spell-picker',
  imports: [Picker],
  templateUrl: './spell-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SpellPicker {
  /** Every spell the slot offers, with the facts of each. */
  public readonly rows = input.required<ReadonlyArray<SpellPickerRow>>();
  /** The picked spell's id; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** A spell was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #translate = injectTranslate();

  protected readonly columns = computed(() => spellPickerColumns(this.#translate()));

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownSpellRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = spellRowValue;
  protected readonly rowLabel = spellRowLabel;
  protected readonly rowDisabled = spellRowDisabled;
}
