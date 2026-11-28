import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { BadgeTone } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { ContentId, Rarity } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { RARITY_TONES } from '../picker-cells/chip-list/chip-list.component';
import { FeatTableSchema } from '../picker-cells/feat-table-schema';
import { PickerCellMessage } from '../picker-cells/picker-cell-messages';
import { FEAT_CATEGORY_MESSAGES, FEAT_RARITY_MESSAGES, FeatPickerMessage } from './feat-picker-messages';
import { FeatPickerColumn } from './feat-picker-row';
import type { FeatPickerRow } from './feat-picker-row';

const rowValue = (row: FeatPickerRow): string => row.id;
const rowLabel = (row: FeatPickerRow): string => row.name;
const rowDisabled = (row: FeatPickerRow): string | undefined => row.disabledReason;

/** The traits as chips, a feat above common rarity first and toned by it. */
function chipsOf(row: FeatPickerRow, say: (key: string) => string): ReadonlyArray<Chip> {
  if (row.rarity === Rarity.Common) {
    return row.traits;
  }

  return [{ label: say(FEAT_RARITY_MESSAGES[row.rarity]), tone: RARITY_TONES[row.rarity] }, ...row.traits];
}

function compare(left: FeatPickerRow, right: FeatPickerRow, sort: PickerSort): number {
  const order =
    sort.column === FeatPickerColumn.Level
      ? left.level - right.level
      : left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

  return sort.descending ? -order : order;
}

/** What a feat is: name, level, category, action cost and traits. `say` reads the cells in the active language. */
function whatColumns(say: (key: string) => string): FeatTableSchema<FeatPickerRow> {
  return new FeatTableSchema<FeatPickerRow>()
    .addEntryName({
      id: FeatPickerColumn.Name,
      header: FeatPickerMessage.Name,
      value: (row) => row.name,
      entry: (row) => ContentId.safeParse(row.id).data,
      width: 'md',
    })
    .addLevel({
      id: FeatPickerColumn.Level,
      header: PickerCellMessage.LevelColumn,
      value: (row) => row.level,
      width: 'sm',
    })
    .addTag({
      id: 'category',
      header: FeatPickerMessage.Category,
      sortable: false,
      value: (row) => ({ label: say(FEAT_CATEGORY_MESSAGES[row.category]), tone: BadgeTone.Neutral }),
      width: 'sm',
    })
    .addActions({
      id: 'actions',
      header: FeatPickerMessage.Actions,
      sortable: false,
      value: (row) => row.action,
      width: 'sm',
    })
    .addTraits({
      id: 'traits',
      header: FeatPickerMessage.Traits,
      sortable: false,
      value: (row) => chipsOf(row, say),
      width: 'md',
    });
}

/** What a feat asks of the character and where it comes from: prerequisites, source and notes. */
function featColumns(say: (key: string) => string): ReadonlyArray<TableColumn<FeatPickerRow>> {
  return whatColumns(say)
    .addPrerequisites({
      id: 'prerequisites',
      header: FeatPickerMessage.Prerequisites,
      sortable: false,
      value: (row) => row.prerequisites,
      width: 'lg',
    })
    .addSource({
      id: 'source',
      header: FeatPickerMessage.Source,
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .addText({
      id: 'notes',
      header: FeatPickerMessage.Notes,
      sortable: false,
      value: (row) => row.note ?? '',
      width: 'md',
    })
    .build();
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

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly columns = computed(() => {
    this.#messages();

    return featColumns((key) => this.#i18n.translate(key));
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
