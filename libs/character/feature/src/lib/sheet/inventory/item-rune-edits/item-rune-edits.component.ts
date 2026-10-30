import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, InventoryItemId, RuneEtchingSchema, runedItemOf } from '@pioneer/character/domain';
import type { Character, InventoryItem, ItemEntry, RunedContent, RuneRef } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Grid, InlineField, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import type { InlineEdit } from '@pioneer/frontier';
import { Picker, PickerField } from '@pioneer/frontier/data';
import { ContentId, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { sheetField } from '../../sheet-field';
import { PickerRows } from '../picker-rows';
import { RuneMove } from './rune-move.component';
import {
  etchedRunes,
  fundamentalRunesFor,
  hasPropertyRoom,
  printedGrade,
  propertyRuneEntries,
  propertyRuneOptions,
} from './rune-options';
import { gradeRows, propertyRows, RUNE_ORDER, runeColumns, runeRowLabel, runeValue } from './rune-picker';
import type { RuneRow, RuneWords } from './rune-picker';
import { describeRuneError, gradeLabel } from './rune-text';

/** No grade etched: the select's value for none, or for what a specific item comes with. */
const NONE = '';
const GradeDraft = z.union([z.literal(NONE), z.string().regex(/^\d$/u)]);

/** The label of each fundamental rune's select, naming the item. */
const GRADE_LABELS: Readonly<Record<FundamentalRune, string>> = {
  [FundamentalRune.Potency]: 'character.sheet.runes.potencyOf',
  [FundamentalRune.Striking]: 'character.sheet.runes.strikingOf',
  [FundamentalRune.Resilient]: 'character.sheet.runes.resilientOf',
  [FundamentalRune.Reinforcing]: 'character.sheet.runes.reinforcingOf',
};

/** What the add-a-property-rune form submits. */
const AddRuneForm = z.object({ rune: ContentId });
interface AddRuneModel {
  readonly rune: string;
}
const EMPTY_ADD: AddRuneModel = { rune: '' };

/** A fundamental rune the item takes, with its select. */
interface GradeRow {
  readonly rune: FundamentalRune;
  readonly label: string;
  readonly edit: InlineEdit<string | undefined>;
  readonly rows: PickerRows<RuneRow>;
}

/** A property rune etched onto the item, to erase. */
interface PropertyRow {
  readonly rune: RuneRef;
  readonly name: string;
}

/**
 * One weapon's, armour's or shield's runes beside it on the sheet: a grade for each fundamental rune it takes, the
 * property runes etched onto it with Erase, a form to etch another, and a form to move a rune onto another item of the
 * same kind (`pio-rune-move`). A specific item's fundamental runes only go higher, and its property runes are its
 * own. Erasing acts on the first press: etching the rune again puts it back (interaction rule 4).
 */
@Component({
  selector: 'pio-item-rune-edits',
  imports: [
    AsyncButton,
    AsyncForm,
    FormField,
    Grid,
    InlineField,
    Picker,
    PickerField,
    RuneMove,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './item-rune-edits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemRuneEdits {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );
  readonly #holder: Signal<Character | undefined> = computed(() =>
    this.#item() === undefined ? undefined : this.#store.selected(),
  );
  readonly #entry: Signal<ItemEntry | undefined> = computed(() => {
    const item = this.#item();
    return item === undefined ? undefined : this.content().items.get(item.item);
  });

  /** Whether the item takes runes at all: a weapon, armour or a shield. */
  protected readonly takesRunes = computed(() => runedItemOf(this.#entry()) !== undefined);

  /** "Fundamental" and "Property", re-read when the language changes or the messages load. */
  readonly #words: Signal<RuneWords> = computed(() => {
    this.#messages();
    return {
      fundamental: this.#i18n.translate('character.sheet.runes.kind.fundamental'),
      property: this.#i18n.translate('character.sheet.runes.kind.property'),
    };
  });

  /** The columns of every rune picker. */
  protected readonly runeColumns = computed(() => {
    this.#messages();
    return runeColumns({
      name: this.#i18n.translate('character.sheet.runes.columns.name'),
      kind: this.#i18n.translate('character.sheet.runes.columns.kind'),
      level: this.#i18n.translate('character.sheet.runes.columns.level'),
      effect: this.#i18n.translate('character.sheet.runes.columns.effect'),
      price: this.#i18n.translate('character.sheet.runes.columns.price'),
      slots: this.#i18n.translate('character.sheet.runes.columns.slots'),
      slotsUsed: this.#i18n.translate('character.sheet.runes.columns.slotsUsed'),
    });
  });
  protected readonly runeValue = runeValue;
  protected readonly runeLabel = runeRowLabel;

  readonly #gradePickers: Readonly<Record<FundamentalRune, PickerRows<RuneRow>>> = {
    [FundamentalRune.Potency]: this.#gradePicker(FundamentalRune.Potency),
    [FundamentalRune.Striking]: this.#gradePicker(FundamentalRune.Striking),
    [FundamentalRune.Resilient]: this.#gradePicker(FundamentalRune.Resilient),
    [FundamentalRune.Reinforcing]: this.#gradePicker(FundamentalRune.Reinforcing),
  };

  readonly #grades: Readonly<Record<FundamentalRune, InlineEdit<string | undefined>>> = {
    [FundamentalRune.Potency]: this.#gradeField(FundamentalRune.Potency),
    [FundamentalRune.Striking]: this.#gradeField(FundamentalRune.Striking),
    [FundamentalRune.Resilient]: this.#gradeField(FundamentalRune.Resilient),
    [FundamentalRune.Reinforcing]: this.#gradeField(FundamentalRune.Reinforcing),
  };

  protected readonly gradeRows: Signal<readonly GradeRow[]> = computed(() => {
    this.#messages();
    const entry = this.#entry();
    return fundamentalRunesFor(entry).map((rune) => ({
      rune,
      label: this.#i18n.translate(GRADE_LABELS[rune], { name: this.name() }),
      edit: this.#grades[rune],
      rows: this.#gradePickers[rune],
    }));
  });

  protected readonly properties: Signal<readonly PropertyRow[]> = computed(() => {
    const item = this.#item();
    const etched = item === undefined ? [] : etchedRunes(item, this.#entry());
    return etched.flatMap((rune): PropertyRow[] =>
      rune.type === RuneType.Property ? [{ rune, name: this.#runeName(rune.rune) }] : [],
    );
  });

  /** The property runes the item can take, while it has room for one, as rows for the picker. */
  protected readonly propertyPicker = new PickerRows<RuneRow>(
    computed(() => {
      const item = this.#item();
      const entry = this.#entry();
      if (item === undefined || !hasPropertyRoom(item, entry)) {
        return [];
      }
      const entries = propertyRuneEntries(this.content(), { item, entry }, (left, right) =>
        this.#format.compare(left, right),
      );
      return propertyRows(entries, this.#words());
    }),
    RUNE_ORDER,
  );

  /** Whether the item could take a property rune, but its potency rune leaves no room. */
  protected readonly needsPotency = computed(() => {
    const item = this.#item();
    const entry = this.#entry();
    if (item === undefined || hasPropertyRoom(item, entry)) {
      return false;
    }
    return propertyRuneOptions(this.content(), { item, entry }, () => 0).length > 0;
  });

  protected readonly model = signal<AddRuneModel>(EMPTY_ADD);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, AddRuneForm);
  });

  protected readonly add = async (value: AddRuneModel): Promise<void> => {
    const { rune } = AddRuneForm.parse(value);
    await this.#store.patch({
      field: CharacterPatchField.EtchRune,
      id: this.id(),
      rune: { type: RuneType.Property, rune },
    });
    this.model.set(EMPTY_ADD);
  };

  protected readonly erase =
    (rune: RuneRef): (() => Promise<void>) =>
    async () =>
      this.#store.patch({ field: CharacterPatchField.EraseRune, id: this.id(), rune });

  protected readonly describeError = (error: unknown): string => describeRuneError(this.#i18n, error);

  /** A property rune's name, or that no loaded content has it. */
  #runeName(id: ContentId): string {
    return this.content().runes.get(id)?.name ?? this.#i18n.translate('character.sheet.runes.unknownRune');
  }

  /** A fundamental rune's select: its grade etched, or none (a specific item's: as it comes). */
  #gradeField(rune: FundamentalRune): InlineEdit<string | undefined> {
    return sheetField<string | undefined>(this.#holder, {
      read: () => {
        const grade = this.#item()?.runes?.[rune];
        return grade === undefined ? NONE : String(grade);
      },
      empty: NONE,
      schema: GradeDraft,
      save: async (value) => this.#saveGrade(rune, GradeDraft.parse(value ?? NONE)),
      format: (value) => this.#gradePickers[rune].all().find((row) => row.value === value)?.label ?? '',
    });
  }

  /** Etches the grade chosen, or erases the rune for none. */
  async #saveGrade(rune: FundamentalRune, value: string): Promise<void> {
    if (value !== NONE) {
      const etching = RuneEtchingSchema.parse({ type: RuneType.Fundamental, rune, grade: Number(value) });
      await this.#store.patch({ field: CharacterPatchField.EtchRune, id: this.id(), rune: etching });
      return;
    }
    if (this.#item()?.runes?.[rune] !== undefined) {
      await this.#store.patch({
        field: CharacterPatchField.EraseRune,
        id: this.id(),
        rune: { type: RuneType.Fundamental, rune },
      });
    }
  }

  /** The rows of `rune`'s picker: none, or a specific item's grade as it comes, then each grade that can be etched. */
  #gradePicker(rune: FundamentalRune): PickerRows<RuneRow> {
    const all = computed((): readonly RuneRow[] => {
      this.#messages();
      const entry = this.#entry();
      const printed = printedGrade(rune, entry);
      const none =
        printed === undefined
          ? this.#i18n.translate('character.sheet.runes.none')
          : this.#i18n.translate('character.sheet.runes.asMade', { grade: gradeLabel(this.#i18n, rune, printed) });
      return gradeRows(
        this.content(),
        { rune, entry, none: { value: NONE, label: none }, words: this.#words() },
        this.#i18n,
      );
    });
    return new PickerRows(all, RUNE_ORDER);
  }
}
