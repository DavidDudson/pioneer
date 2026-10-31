import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Text } from '@pioneer/frontier';

import type { LineLoad } from '../inventory-line';
import { InventoryMessage, LOAD_EFFECT_MESSAGES } from '../inventory-messages';

/** A container's load as shown: what it holds against its limit, and why its contents count as they do. */
interface ShownLoad {
  readonly key: string;
  readonly params: { readonly held: string; readonly capacity?: string };
  readonly reason: string;
}

/** What a container holds against what it can, and what it does to the Bulk it holds; nothing for an item that holds nothing. */
@Component({
  selector: 'pio-inventory-load',
  imports: [Text, TranslocoPipe],
  templateUrl: './inventory-load.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryLoad {
  public readonly load = input<LineLoad | undefined>(undefined);

  readonly #format = inject(LocaleFormat);
  protected readonly shown = computed((): ShownLoad | undefined => {
    const load = this.load();
    if (load === undefined) {
      return undefined;
    }
    const held = this.#format.number(load.held);
    const reason = LOAD_EFFECT_MESSAGES[load.effect];
    return load.capacity === undefined
      ? { key: InventoryMessage.LoadUnlimited, params: { held }, reason }
      : { key: InventoryMessage.Load, params: { held, capacity: this.#format.number(load.capacity) }, reason };
  });
}
