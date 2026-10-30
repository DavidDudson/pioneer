import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { HANDS_MAX, ONE_HAND } from '@pioneer/character/domain';
import type { ItemEntry } from '@pioneer/character/domain';
import type { TableColumn } from '@pioneer/frontier/data';
import { BulkWeight, ContentKind } from '@pioneer/rules/sdk';
import type { Bulk } from '@pioneer/rules/sdk';
import { ItemTableSchema } from '@pioneer/rules/ui';
import type { Chip } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CARRY_LABELS, CarryChoice, carryChoices } from './carry-options';
import { PickerRows } from './picker-rows';
import type { RowOrder } from './picker-rows';

/** One way to carry an item: its name, the hands it takes, what it does and the Bulk it adds. */
export interface CarryRow {
  readonly value: CarryChoice;
  readonly label: string;
  /** The hands it takes: none, one or both. */
  readonly hands: number;
  /** What carrying it this way does, already translated. */
  readonly effect: string;
  /** The Bulk it adds while carried this way. */
  readonly bulk: Bulk;
}

/** What a column header says, in the active language. */
interface CarryHeaders {
  readonly name: string;
  readonly hands: string;
  readonly effect: string;
  readonly bulk: string;
}

const HANDS_TAKEN: Readonly<Record<CarryChoice, number>> = {
  [CarryChoice.Worn]: 0,
  [CarryChoice.OneHand]: ONE_HAND,
  [CarryChoice.TwoHands]: HANDS_MAX,
  [CarryChoice.Stowed]: 0,
  [CarryChoice.Dropped]: 0,
};

const EFFECT_KEYS: Readonly<Record<CarryChoice, string>> = {
  [CarryChoice.Worn]: 'character.sheet.inventory.carryEffect.worn',
  [CarryChoice.OneHand]: 'character.sheet.inventory.carryEffect.oneHand',
  [CarryChoice.TwoHands]: 'character.sheet.inventory.carryEffect.twoHands',
  [CarryChoice.Stowed]: 'character.sheet.inventory.carryEffect.stowed',
  [CarryChoice.Dropped]: 'character.sheet.inventory.carryEffect.dropped',
};

/** The Bulk `entry` adds carried as `choice`: nothing dropped, a container's lighter worn weight worn, else its own. */
export function bulkCarried(entry: ItemEntry | undefined, choice: CarryChoice): Bulk {
  if (entry === undefined || choice === CarryChoice.Dropped) {
    return BulkWeight.Negligible;
  }
  const held = entry.kind === ContentKind.Equipment ? entry.data.container?.heldBulk : undefined;
  return choice === CarryChoice.Worn ? entry.data.bulk : (held ?? entry.data.bulk);
}

/** The ways `entry` can be carried as rows, each translated by `say`. */
export function carryRows(entry: ItemEntry | undefined, say: (key: string) => string): readonly CarryRow[] {
  return carryChoices(entry).map((choice) => ({
    value: choice,
    label: say(CARRY_LABELS[choice]),
    hands: HANDS_TAKEN[choice],
    effect: say(EFFECT_KEYS[choice]),
    bulk: bulkCarried(entry, choice),
  }));
}

/** How the carry rows are searched and sorted. */
export const CARRY_ORDER: RowOrder<CarryRow> = {
  text: (row) => `${row.label} ${row.effect}`,
  sortKey: { name: (row) => row.label, hands: (row) => row.hands },
};

/** The columns of a carry picker: the way, the hands it takes as a meter, what it does, and the Bulk it adds. */
function carryColumns(headers: CarryHeaders, handsLabel: string): readonly TableColumn<CarryRow>[] {
  return new ItemTableSchema<CarryRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.label, width: 'md' })
    .addCount({
      id: 'hands',
      header: headers.hands,
      label: handsLabel,
      value: (row) => row.hands,
      max: () => HANDS_MAX,
      width: 'sm',
    })
    .addTraits({
      id: 'effect',
      header: headers.effect,
      sortable: false,
      value: (row): readonly Chip[] => [{ label: row.effect }],
      width: 'lg',
    })
    .addBulk({ id: 'bulk', header: headers.bulk, value: (row) => row.bulk, width: 'sm' })
    .build();
}

const carryValue = (row: CarryRow): string => row.value;
const carryLabel = (row: CarryRow): string => row.label;

/** A carry picker's rows, columns and the functions it reads them with. */
export interface CarryPicker {
  readonly rows: PickerRows<CarryRow>;
  readonly columns: Signal<readonly TableColumn<CarryRow>[]>;
  readonly value: (row: CarryRow) => string;
  readonly label: (row: CarryRow) => string;
}

/**
 * The carry picker for the item of `entry`. Re-read when the messages load or the language changes, as the place
 * picker is. Call in an injection context.
 */
export function injectCarryPicker(entry: Signal<ItemEntry | undefined>): CarryPicker {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  const all = computed((): readonly CarryRow[] => {
    messages();
    return carryRows(entry(), (key) => i18n.translate(key));
  });
  const columns = computed(() => {
    messages();
    return carryColumns(
      {
        name: i18n.translate('character.sheet.inventory.carryColumns.name'),
        hands: i18n.translate('character.sheet.inventory.carryColumns.hands'),
        effect: i18n.translate('character.sheet.inventory.carryColumns.effect'),
        bulk: i18n.translate('character.sheet.inventory.carryColumns.bulk'),
      },
      i18n.translate('character.sheet.inventory.carryColumns.handsUsed'),
    );
  });
  return { rows: new PickerRows(all, CARRY_ORDER), columns, value: carryValue, label: carryLabel };
}
