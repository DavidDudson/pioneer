import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { originRowDisabled, originRowLabel, originRowValue } from '../origin-picker/origin-picker-table';
import type { SkillPickerRow } from './slot-picker-row';
import { shownSkillRows, skillPickerColumns, typedLoreRow } from './slot-picker-table';

/**
 * Pick a skill from a table of its governing attribute and the character's rank and modifier in it. Opens inline and
 * starts at the search box. The table searches by name and sorts by name, rank or modifier on the rows it is given.
 *
 * ```html
 * <pio-skill-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Skill" />
 * ```
 */
@Component({
  selector: 'pio-skill-picker',
  imports: [Picker],
  templateUrl: './skill-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SkillPicker {
  /** Every skill the slot offers, with the character's standing in it. */
  public readonly rows = input.required<readonly SkillPickerRow[]>();
  /** The picked skill; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** What is typed in the search box and names no skill on offer can be added as a Lore (a custom-named one). */
  public readonly allowLore = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A skill was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  readonly #say = (key: string, params?: object): string => this.#i18n.translate(key, params);

  protected readonly columns = computed(() => {
    this.#messages();
    return skillPickerColumns(this.#say);
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => {
    const rows = shownSkillRows(this.rows(), this.query(), this.sorting());
    const lore = this.allowLore() ? typedLoreRow(this.query(), this.rows(), this.#say) : undefined;
    return lore === undefined ? rows : [...rows, lore];
  });

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
