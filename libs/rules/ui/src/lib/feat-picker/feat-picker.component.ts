import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { BadgeTone } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { ContentId, Rarity } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { RARITY_TONES } from '../picker-cells/chip-list/chip-list.component';
import { FeatTableSchema } from '../picker-cells/feat-table-schema';
import { FEAT_CATEGORY_MESSAGES, FEAT_RARITY_MESSAGES, FeatPickerMessage } from './feat-picker-messages';
import { FeatPickerColumn } from './feat-picker-row';
import type { FeatPickerRow } from './feat-picker-row';

const rowValue = (row: FeatPickerRow): string => row.id;
const rowLabel = (row: FeatPickerRow): string => row.name;
const rowDisabled = (row: FeatPickerRow): string | undefined => row.disabledReason;

/** The traits as chips, a feat above common rarity first and toned by it. */
function chipsOf(row: FeatPickerRow, say: (key: string) => string): readonly Chip[] {
  const traits = row.traits.map((label): Chip => ({ label }));
  if (row.rarity === Rarity.Common) {
    return traits;
  }
  return [{ label: say(FEAT_RARITY_MESSAGES[row.rarity]), tone: RARITY_TONES[row.rarity] }, ...traits];
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FeatPicker {
  /** Every feat the slot offers, with the facts of each. */
  public readonly rows = input.required<readonly FeatPickerRow[]>();
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
    const say = (key: string): string => this.#i18n.translate(key);
    const headers = {
      name: say(FeatPickerMessage.Name),
      level: say(FeatPickerMessage.Level),
      category: say(FeatPickerMessage.Category),
      actions: say(FeatPickerMessage.Actions),
      traits: say(FeatPickerMessage.Traits),
      prerequisites: say(FeatPickerMessage.Prerequisites),
      source: say(FeatPickerMessage.Source),
      notes: say(FeatPickerMessage.Notes),
    };
    return new FeatTableSchema<FeatPickerRow>()
      .addEntryName({
        id: FeatPickerColumn.Name,
        header: headers.name,
        value: (row) => row.name,
        entry: (row) => ContentId.safeParse(row.id).data,
        width: 'md',
      })
      .addLevel({ id: FeatPickerColumn.Level, header: headers.level, value: (row) => row.level, width: 'sm' })
      .addTag({
        id: 'category',
        header: headers.category,
        sortable: false,
        value: (row) => ({ label: say(FEAT_CATEGORY_MESSAGES[row.category]), tone: BadgeTone.Neutral }),
        width: 'sm',
      })
      .addActions({ id: 'actions', header: headers.actions, sortable: false, value: (row) => row.action, width: 'sm' })
      .addTraits({
        id: 'traits',
        header: headers.traits,
        sortable: false,
        value: (row) => chipsOf(row, say),
        width: 'md',
      })
      .addPrerequisites({
        id: 'prerequisites',
        header: headers.prerequisites,
        sortable: false,
        value: (row) => row.prerequisites,
        width: 'lg',
      })
      .addSource({ id: 'source', header: headers.source, sortable: false, value: (row) => row.sources, width: 'md' })
      .addText({ id: 'notes', header: headers.notes, sortable: false, value: (row) => row.note ?? '', width: 'md' })
      .build();
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed((): readonly FeatPickerRow[] => {
    const needle = this.query().trim().toLocaleLowerCase();
    const sort = this.sorting();
    const matching = this.rows().filter((row) => row.name.toLocaleLowerCase().includes(needle));
    return sort === undefined ? matching : matching.toSorted((left, right) => compare(left, right, sort));
  });

  protected readonly rowValue = rowValue;
  protected readonly rowLabel = rowLabel;
  protected readonly rowDisabled = rowDisabled;
}
