import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { ContainerEffect, containerLoad, InventoryItemId } from '@pioneer/character/domain';
import type { Inventory, ItemContent } from '@pioneer/character/domain';
import { LocaleFormat } from '@pioneer/frontier';
import type { TableColumn } from '@pioneer/frontier/data';
import { PickerRows, RulesTableSchema } from '@pioneer/rules/ui';
import type { Chip, RowOrder } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { containerOptions, LOOSE } from './sheet-inventory';

/** Tenths in a Bulk: what `containerLoad` counts in. */
const TENTHS = 10;

/** One place an item can go: its name, what it holds against what it can, and how many lines are in it. */
export interface PlaceRow {
  readonly value: string;
  readonly label: string;
  /** The Bulk inside, in tenths; undefined for the loose place, which is no container. */
  readonly held: number | undefined;
  /** The whole Bulk it can hold; undefined when unlimited. */
  readonly capacity: number | undefined;
  /** What the container does to the Bulk it holds, which the Bulk column gives as the reason; undefined for the loose place. */
  readonly effect: ContainerEffect | undefined;
  /** The lines inside it. */
  readonly lines: number;
}

/** The message that says why a container's Bulk is what it is, by what it does to the Bulk it holds. */
const EFFECT_REASONS: Readonly<Record<ContainerEffect, string>> = {
  [ContainerEffect.AddsAll]: 'character.sheet.inventory.placeEffect.addsAll',
  [ContainerEffect.Ignores]: 'character.sheet.inventory.placeEffect.ignores',
  [ContainerEffect.AddsNone]: 'character.sheet.inventory.placeEffect.addsNone',
};

/** What a column header says, in the active language. */
interface PlaceHeaders {
  readonly name: string;
  readonly bulk: string;
  readonly items: string;
}

/** How the places are searched and sorted. */
export const PLACE_ORDER: RowOrder<PlaceRow> = {
  text: (row) => row.label,
  sortKey: {
    name: (row) => row.label,
    bulk: (row) => row.held ?? -1,
    items: (row) => row.lines,
  },
};

/** The columns of a place picker: the name, what it holds against its limit as a chip, and how many items. */
function placeColumns(
  headers: PlaceHeaders,
  chips: {
    readonly bulk: (row: PlaceRow) => readonly Chip[];
    readonly items: (row: PlaceRow) => readonly Chip[];
  },
): readonly TableColumn<PlaceRow>[] {
  return new RulesTableSchema<PlaceRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.label, width: 'md' })
    .addTraits({ id: 'bulk', header: headers.bulk, value: chips.bulk, width: 'md' })
    .addTraits({ id: 'items', header: headers.items, value: chips.items, width: 'sm' })
    .build();
}

const placeValue = (row: PlaceRow): string => row.value;
const placeLabel = (row: PlaceRow): string => row.label;

/** Which item is being placed, and what the loose place is called. */
export interface PlaceScope {
  readonly moving: InventoryItemId | undefined;
  readonly loose: string;
}

/** The loose place, then each container `moving` isn't in, with what it holds. */
export function placeRows(inventory: Inventory, content: ItemContent, where: PlaceScope): readonly PlaceRow[] {
  const { moving, loose } = where;
  const looseLines = inventory.items.filter((each) => each.container === undefined).length;
  const containers = containerOptions(inventory, content, moving).map((option): PlaceRow => {
    const load = containerLoad(inventory, content, InventoryItemId.parse(option.value));
    return {
      value: option.value,
      label: option.label,
      held: load?.held,
      capacity: load?.capacity,
      effect: load?.effect,
      lines: load?.lines ?? 0,
    };
  });
  return [
    { value: LOOSE, label: loose, held: undefined, capacity: undefined, effect: undefined, lines: looseLines },
    ...containers,
  ];
}

/** A place picker's rows, columns and the functions it reads them with. */
export interface PlacePicker {
  readonly rows: PickerRows<PlaceRow>;
  readonly columns: Signal<readonly TableColumn<PlaceRow>[]>;
  readonly value: (row: PlaceRow) => string;
  readonly label: (row: PlaceRow) => string;
}

/**
 * The place picker for an item `moving` (or a new one when undefined): the places as rows, the columns, and the
 * search and sort the picker reports. Re-read when the messages load or the language changes. Call in an injection
 * context.
 */
export function injectPlacePicker(
  content: Signal<ItemContent>,
  moving: Signal<InventoryItemId | undefined>,
): PlacePicker {
  const i18n = inject(TranslocoService);
  const store = inject(CharacterStore);
  const format = inject(LocaleFormat);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  const all = computed((): readonly PlaceRow[] => {
    messages();
    const inventory = store.selected()?.document.inventory;
    const loose = i18n.translate('character.sheet.inventory.loose');
    return inventory === undefined
      ? [{ value: LOOSE, label: loose, held: undefined, capacity: undefined, effect: undefined, lines: 0 }]
      : placeRows(inventory, content(), { moving: moving(), loose });
  });
  const columns = computed(() => {
    messages();
    return placeColumns(
      {
        name: i18n.translate('character.sheet.inventory.placeColumns.name'),
        bulk: i18n.translate('character.sheet.inventory.placeColumns.bulk'),
        items: i18n.translate('character.sheet.inventory.placeColumns.items'),
      },
      {
        bulk: (row) => bulkChips(row, i18n, format),
        items: (row) => [{ label: i18n.translate('character.sheet.inventory.placeItems', { count: row.lines }) }],
      },
    );
  });
  return { rows: new PickerRows(all, PLACE_ORDER), columns, value: placeValue, label: placeLabel };
}

function bulkChips(row: PlaceRow, i18n: TranslocoService, format: LocaleFormat): readonly Chip[] {
  if (row.held === undefined) {
    return [];
  }
  const held = format.number(row.held / TENTHS);
  const reason = row.effect === undefined ? [] : [{ label: i18n.translate(EFFECT_REASONS[row.effect]) }];
  return [
    {
      label:
        row.capacity === undefined
          ? i18n.translate('character.sheet.inventory.placeBulkUnlimited', { held })
          : i18n.translate('character.sheet.inventory.placeBulk', { held, capacity: format.number(row.capacity) }),
    },
    ...reason,
  ];
}
