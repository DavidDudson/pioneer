import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, LocaleFormat, Stack, Text, Tone } from '@pioneer/frontier';
import type { Bulk } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { InventoryLine } from '../inventory-line';
import { BULK_WEIGHT_MESSAGES, InventoryMessage } from '../inventory-messages';

/** What the caller shows beside each line: the line's edits. */
export interface InventoryLineContext {
  readonly $implicit: InventoryLine;
}

/** Bulk as shown: "Bulk {bulk}" or "Bulk {bulk} per {count}", around "1", "L" or "—". */
interface ShownBulk {
  readonly key: string;
  readonly value: MessageDescriptor;
  readonly per: string | undefined;
}

/** A line as shown: its name, or what stands in for content that's gone, and its numbers formatted. */
interface ShownLine {
  readonly name: string | undefined;
  readonly nameTone: Tone;
  readonly quantity: string;
  readonly bulk: ShownBulk | undefined;
}

/**
 * One item: its name (and the content's, when the player renamed it), how many, its Bulk, then whatever the caller
 * puts beside it, and what it holds beneath it.
 */
@Component({
  selector: 'pio-inventory-row',
  imports: [List, ListItem, NgTemplateOutlet, Stack, Text, TranslocoPipe],
  templateUrl: './inventory-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryRow {
  public readonly line = input.required<InventoryLine>();
  /** Shown beside the line, and beside each line it holds. */
  public readonly actions = input<TemplateRef<InventoryLineContext> | undefined>(undefined);

  readonly #format = inject(LocaleFormat);
  protected readonly Message = InventoryMessage;
  protected readonly shown = computed((): ShownLine => {
    const { name, quantity, bulk, bulkPer } = this.line();
    return {
      name,
      nameTone: name === undefined ? Tone.Subtle : Tone.Default,
      quantity: this.#format.number(quantity),
      bulk: bulk === undefined ? undefined : this.#bulk(bulk, bulkPer),
    };
  });

  #bulk(bulk: Bulk, per: number | undefined): ShownBulk {
    const value =
      typeof bulk === 'number'
        ? message(InventoryMessage.BulkCount, { count: this.#format.number(bulk) })
        : message(BULK_WEIGHT_MESSAGES[bulk]);
    return per === undefined
      ? { key: InventoryMessage.Bulk, value, per: undefined }
      : { key: InventoryMessage.BulkPer, value, per: this.#format.number(per) };
  }
}
