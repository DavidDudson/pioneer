import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import type { DeityPickerRow } from './deity-picker-row';
import {
  deityPickerColumns,
  deityRowDisabled,
  deityRowLabel,
  deityRowValue,
  shownDeityRows,
} from './deity-picker-table';

/**
 * Pick a deity from a table of what decides the choice: sanctification, divine font, domains, favoured weapon, divine
 * skill, a summary of its edicts and anathema, and where it comes from. Opens inline and starts at the search box, so
 * it suits an inline editor. A deity the character can't follow stays in the table, disabled, saying why. The table
 * searches and sorts by name on the rows it is given.
 *
 * ```html
 * <pio-deity-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Deity" />
 * ```
 */
@Component({
  selector: 'pio-deity-picker',
  imports: [Picker],
  templateUrl: './deity-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DeityPicker {
  /** Every deity the slot offers, with the facts of each. */
  public readonly rows = input.required<readonly DeityPickerRow[]>();
  /** The picked deity's id; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** A deity was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly columns = computed(() => {
    this.#messages();
    return deityPickerColumns((key) => this.#i18n.translate(key));
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownDeityRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = deityRowValue;
  protected readonly rowLabel = deityRowLabel;
  protected readonly rowDisabled = deityRowDisabled;
}
